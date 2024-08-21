import {Accessor, JSX, Show} from 'solid-js';

import {type Domain} from './State';
import {Layer} from './layers/Layer';
import {xcFlyingPotentialLayer} from './layers/ThQ';
import {soaringLayerDepthLayer} from './layers/SoaringLayerDepth';
import {
  _2000MAMSLWindLayer,
  _3000MAMSLWindLayer,
  _300MAGLWindLayer,
  _4000MAMSLWindLayer,
  boundaryLayerWindLayer,
  soaringLayerTopWindLayer,
  surfaceWindLayer
} from './layers/Wind';
import {cloudsRainLayer} from './layers/CloudsRain';
import {thermalVelocityLayer} from './layers/ThermalVelocity';
import {cumuliDepthLayer} from './layers/CumuliDepth';
import {showDate} from './shared';
import {Checkbox, Radio, Select} from './styles/Forms';
import {burgerBorderTopStyle, burgerPaddingStyle} from "./styles/Styles";
import {useI18n} from "./i18n";
import {gfsName, ModelName, wrfName, Zone} from "./data/Model";

/**
 * Overlay on the map that displays the soaring forecast.
 */
export const LayersSelector = (props: {
  domain: Domain
}): JSX.Element => {

  const { m, zoneLabel } = useI18n();

  const fieldsetPaddingStyle =
    { padding: '0.2em 0.75em', margin: '.25em .5em' };

  const selectForecastEl =
    <>
      <div style={{ ...burgerPaddingStyle, ...burgerBorderTopStyle, 'padding-bottom': 0 }}>{ m().menuForecastData() }</div>
      <fieldset style={ fieldsetPaddingStyle}>
        <legend>{ m().menuModel() }</legend>
        {
          new Array<[string, () => string, ModelName]>(
            ['soarGFS (25 km)', () => m().menuGFSLegend(), gfsName],
            ['soarWRF (2-6 km)', () => m().menuWRFLegend(), wrfName]
          )
            .map(([label, title, modelName]) =>
              <Radio
                label={ label }
                title={ title() }
                checked={ modelName === props.domain.state.model.name }
                groupName="model"
                onChange={ () => props.domain.setModel(modelName) }
              />
            )
        }
      </fieldset>
      <Show when={ props.domain.state.model.name === gfsName }>
        <fieldset style={ fieldsetPaddingStyle }>
          <legend>{ m().menuInitializationTime() }</legend>
          <Select
            title={ m().menuInitializationTimeLegend() }
            options={
              props.domain.gfsRuns.map(gfsRun => {
                const initTimeString =
                  showDate(
                    gfsRun.init,
                    { showWeekDay: true, timeZone: props.domain.timeZone() }
                  );
                return [initTimeString, gfsRun]
              })
            }
            selectedOption={ props.domain.state.forecastMetadata }
            onChange={ forecastMetadata => props.domain.setForecastMetadata(forecastMetadata) }
            key={ forecastMetadata => forecastMetadata.runPath }
          />
        </fieldset>
      </Show>
      <fieldset style={ fieldsetPaddingStyle }>
        <legend>{ m().menuZone() }</legend>
        {
          props.domain.state.model.zones
            .map<[Accessor<string>, Zone]>(zone => [zoneLabel(zone.id), zone])
            .sort(([label1, zone1], [label2, zone2]) => label1().localeCompare(label2()))
            .map(([label, zone]) =>
              <Radio
                label={label()}
                title={label()}
                checked={ zone.id === props.domain.state.selectedZone.id }
                groupName="zone"
                onChange={ () => props.domain.setZone(zone) }
                disabled={ !props.domain.state.forecastMetadata.availableZones.some(availableZone => availableZone.id === zone.id) }
              />
            )
        }
      </fieldset>
    </>;

  function setupLayerBtn(layer: Layer, layerType: 'primary-layer' | 'wind-layer'): JSX.Element {
    return <Radio
      label={ layer.name() }
      title={ layer.title() }
      checked={ props.domain.state.primaryLayer.key === layer.key || props.domain.state.windLayer.key === layer.key } // Note: for some reason, comparing the layers does not work but comparing the keys does.
      groupName={ layerType }
      onChange={ () => {
        switch (layerType) {
          case 'primary-layer':
            props.domain.setPrimaryLayer(layer);
            break;
          case 'wind-layer':
            props.domain.setWindLayer(layer);
            break;
        }
      }}
    />;
  }

  const thqEl = setupLayerBtn(xcFlyingPotentialLayer, 'primary-layer');

  const boundaryLayerHeightEl = setupLayerBtn(soaringLayerDepthLayer, 'primary-layer');
  const thermalVelocityEl = setupLayerBtn(thermalVelocityLayer, 'primary-layer');

  const blWindEl = setupLayerBtn(boundaryLayerWindLayer, 'wind-layer');
  const blTopWindEl = setupLayerBtn(soaringLayerTopWindLayer, 'wind-layer');
  const surfaceWindEl = setupLayerBtn(surfaceWindLayer, 'wind-layer');
  const _300MAGLWindEl = setupLayerBtn(_300MAGLWindLayer, 'wind-layer');
  const _2000MAMSLWindEl = setupLayerBtn(_2000MAMSLWindLayer, 'wind-layer');
  const _3000MAMSLWindEl = setupLayerBtn(_3000MAMSLWindLayer, 'wind-layer');
  const _4000MAMSLWindEl = setupLayerBtn(_4000MAMSLWindLayer, 'wind-layer');
  const windCheckBox =
    <Checkbox
        label={ m().menuWind() }
        title={ m().menuWindLegend() }
        checked={ props.domain.state.windLayerEnabled }
        onChange={ (value) => props.domain.enableWindLayer(value) }
    />;
  const windLayersEl =
    <fieldset style={ fieldsetPaddingStyle }>
      <legend>{windCheckBox}</legend>
      {surfaceWindEl}
      {_300MAGLWindEl}
      {blWindEl}
      {blTopWindEl}
      {_2000MAMSLWindEl}
      {_3000MAMSLWindEl}
      {_4000MAMSLWindEl}
    </fieldset>;

  const cloudsRainEl = setupLayerBtn(cloudsRainLayer, 'primary-layer');
  const cumuliDepthEl = setupLayerBtn(cumuliDepthLayer, 'primary-layer');

  const primaryLayerEl =
    <fieldset style={ fieldsetPaddingStyle }>
      <legend>
        <Checkbox
          label={ m().menuOverlay() }
          title={ m().menuOverlayLegend() }
          checked={ props.domain.state.primaryLayerEnabled }
          onChange={ (value) => props.domain.enablePrimaryLayer(value) }
        />
      </legend>
      {thqEl}
      {boundaryLayerHeightEl}
      {thermalVelocityEl}
      {cloudsRainEl}
      {cumuliDepthEl}
    </fieldset>;

  return <>
    <div style={{ ...burgerPaddingStyle, ...burgerPaddingStyle, 'padding-bottom': 0 }}>{ m().menuDisplayOnMap() }</div>
    {primaryLayerEl}
    {windLayersEl}
    {selectForecastEl}
  </>
};
