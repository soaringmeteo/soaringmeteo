import {Accessor, createEffect, createResource, createSignal, JSX, Match, Show, Switch} from 'solid-js';

import { closeButton, surfaceOverMap } from './styles/Styles';
import layersImg from './images/layers.png';
import {Domain, gfsModel, wrfModel} from './State';
import { Layer } from './layers/Layer';
import { noLayer } from './layers/None';
import { xcFlyingPotentialLayer } from './layers/ThQ';
import { soaringLayerDepthLayer } from './layers/SoaringLayerDepth';
import { boundaryLayerWindLayer, soaringLayerTopWindLayer, surfaceWindLayer, _2000MAMSLWindLayer, _3000MAMSLWindLayer, _300MAGLWindLayer, _4000MAMSLWindLayer } from './layers/Wind';
import { cloudCoverLayer } from './layers/CloudCover';
import { thermalVelocityLayer } from './layers/ThermalVelocity';
import { rainLayer } from './layers/Rain';
import { cumuliDepthLayer } from './layers/CumuliDepth';
import {showCoordinates, showDate} from './shared';
import {Checkbox, Radio, Select} from './styles/Forms';
import {MapBrowserEvent} from "ol";
import {toLonLat} from "ol/proj";

/**
 * Overlay on the map that displays the soaring forecast.
 */
export const LayersSelector = (props: {
  popupRequest: Accessor<undefined | MapBrowserEvent<any>>
  openLocationDetailsPopup: (latitude: number, longitude: number, content: HTMLElement) => void
  closeLocationDetailsPopup: () => void
  domain: Domain
}): JSX.Element => {

  const state = props.domain.state;

  const [isMenuShown, showMenu] = createSignal(false);

  const fieldsetPaddingStyle = { padding: '0.2em 0.2em' };

  const selectForecastEl =
    <fieldset style={ fieldsetPaddingStyle }>
      <legend>Forecast Data</legend>
      <fieldset style={ fieldsetPaddingStyle}>
        <legend>Model</legend>
        <Select
          title="Numerical Weather Prediction Model"
          options={ [['GFS (25 km)', gfsModel], ['WRF (2-6 km)', wrfModel]] }
          selectedOption={ state.model }
          onChange={ model => props.domain.setModel(model) }
          key={ model => model }
        />
      </fieldset>
      <Show when={ state.model === gfsModel }>
        <fieldset style={ fieldsetPaddingStyle }>
          <legend>Initialization Time</legend>
          <Select
            title="Initialization time of the forecast run"
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
            selectedOption={ state.forecastMetadata }
            onChange={ forecastMetadata => props.domain.setForecastMetadata(forecastMetadata) }
            key={ forecastMetadata => forecastMetadata.initS }
          />
        </fieldset>
      </Show>
      <fieldset style={ fieldsetPaddingStyle }>
        <legend>Zone</legend>
          <Select
            title="Zone to display"
            options={
              props.domain.state.forecastMetadata.zones
                .sort((zone1, zone2) => zone1.label.localeCompare(zone2.label))
                .map(zone => [zone.label, zone])
            }
            selectedOption={ props.domain.state.zone }
            onChange={ zone => props.domain.setZone(zone) }
            key={ zone => zone.id }
          />
      </fieldset>
    </fieldset>;

  function setupLayerBtn(layer: Layer, layerType: 'primary-layer' | 'wind-layer'): JSX.Element {
    return <Radio
      label={ layer.name }
      title={ layer.title }
      checked={ state.primaryLayer.key === layer.key || state.windLayer.key === layer.key } // Note: for some reason, comparing the layers does not work but comparing the keys does.
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

  const noneEl = setupLayerBtn(noLayer, 'primary-layer');
  const thqEl = setupLayerBtn(xcFlyingPotentialLayer, 'primary-layer');

  const boundaryLayerHeightEl = setupLayerBtn(soaringLayerDepthLayer, 'primary-layer');
  const thermalVelocityEl = setupLayerBtn(thermalVelocityLayer, 'primary-layer');
  const thermalLayersEl =
    <fieldset style={ fieldsetPaddingStyle }>
      <legend>Thermals</legend>
      {boundaryLayerHeightEl}
      {thermalVelocityEl}
    </fieldset>;

  const blWindEl = setupLayerBtn(boundaryLayerWindLayer, 'wind-layer');
  const blTopWindEl = setupLayerBtn(soaringLayerTopWindLayer, 'wind-layer');
  const surfaceWindEl = setupLayerBtn(surfaceWindLayer, 'wind-layer');
  const _300MAGLWindEl = setupLayerBtn(_300MAGLWindLayer, 'wind-layer');
  const _2000MAMSLWindEl = setupLayerBtn(_2000MAMSLWindLayer, 'wind-layer');
  const _3000MAMSLWindEl = setupLayerBtn(_3000MAMSLWindLayer, 'wind-layer');
  const _4000MAMSLWindEl = setupLayerBtn(_4000MAMSLWindLayer, 'wind-layer');
  const windCheckBox =
    <Checkbox
        label="Wind"
        title="Show wind force and direction at various elevation levels"
        checked={ state.windLayerEnabled }
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

  const cloudCoverEl = setupLayerBtn(cloudCoverLayer, 'primary-layer');
  const cumuliDepthEl = setupLayerBtn(cumuliDepthLayer, 'primary-layer');
  const rainEl = setupLayerBtn(rainLayer, 'primary-layer');
  const cloudsLayersEl =
    <fieldset style={ fieldsetPaddingStyle }>
      <legend>Clouds and Rain</legend>
      {cloudCoverEl}
      {cumuliDepthEl}
      {rainEl}
    </fieldset>

  const layerEl =
    <fieldset style={ fieldsetPaddingStyle }>
      <legend>Layers</legend>
      {noneEl}
      {thqEl}
      {thermalLayersEl}
      {cloudsLayersEl}
      {windLayersEl}
    </fieldset>;

  const aboveMapStyle = { ...surfaceOverMap, position: 'absolute', 'user-select': 'none' };

  const layersBtn =
    <Switch>
      <Match when={ isMenuShown() }>
        <div style={{ ...aboveMapStyle, right: '3px', bottom: '192px', 'background-color': 'white', 'font-size': '0.8125rem' } as JSX.CSSProperties}>
          {selectForecastEl}
          {layerEl}
        </div>
        <div
          onClick={ () => showMenu(false) }
          style={{ ...aboveMapStyle, ...closeButton, right: '12px', bottom: '154px' } as JSX.CSSProperties}
        >⨯</div>
      </Match>
      <Match when={ !isMenuShown() }>
        <div
          onClick={ () => showMenu(true) }
          style={{ ...aboveMapStyle, right: '5px', bottom: '150px', width: '44px', height: '44px', 'line-height': '44px', color: 'black', display: 'block', cursor: 'pointer', 'text-align': 'center', 'background-image': `url('${layersImg}')`, 'background-position': '50% 50%', 'background-repeat': 'no-repeat', 'background-color': 'white', border: '1px solid rgba(0, 0, 0, 0.2)', 'border-radius': '4px' } as JSX.CSSProperties}
        />
      </Match>
    </Switch>;

  // Wrapper element so that we can disable event propagation below
  const rootElement =
    <div>
      {layersBtn}
    </div> as HTMLElement;

  const primaryLayerComponents = () => props.domain.primaryLayerReactiveComponents();
  const windLayerComponents    = () => props.domain.windLayerReactiveComponents();

  const layerKeyEl =
    <div style={{
      position: 'absolute',
      bottom: '40px',
      left: '5px',
      'background-color': 'rgba(255, 255,  255, 0.5',
      'font-size': '11px',
      'padding': '5px',
      'text-align': 'center'
    }}>
      {primaryLayerComponents().mapKey}
    </div>;

  // Show a popup with a summary when the user clicks on the map
  createEffect(() => {
    const event = props.popupRequest();
    if (event === undefined) {
      return
    }

    const [eventLng, eventLat] = toLonLat(event.coordinate);
    const maybePoint =
      props.domain.state.forecastMetadata.closestPoint(props.domain.state.zone, eventLng, eventLat);
    if (maybePoint === undefined) {
      return
    }

    const [longitude, latitude] =
      props.domain.state.forecastMetadata.toLonLat(props.domain.state.zone, maybePoint);

    const summaryPromise =
      state.windLayerEnabled ?
        Promise.all([
          primaryLayerComponents().summarizer().summary(latitude, longitude),
          windLayerComponents().summarizer().summary(latitude, longitude)
        ])
          .then(([primarySummary, windSummary]) => primarySummary?.concat(windSummary || [])) :
        primaryLayerComponents().summarizer().summary(latitude, longitude);
    const [summaryResource] =
      createResource(() => summaryPromise.then(summary =>
        summary !== undefined && summary.length !== 0 ? summary : undefined
      ));
    const content =
      <div style={{ ...surfaceOverMap, background: 'white', padding: '.7em', 'font-size': '0.8125rem', 'text-align': 'left', 'border-radius': '5px' }}>
        <span
          style={{ position: 'absolute', top: '2px', right: '8px', cursor: 'pointer', 'font-weight': 'bold' }}
          onClick={ () => props.closeLocationDetailsPopup() }
          title="Close"
        >
          ×
        </span>
        <div>Grid point: { showCoordinates(longitude, latitude, props.domain.state.model) }</div>
        <div>Forecast for {showDate(state.forecastMetadata.dateAtHourOffset(state.hourOffset), { showWeekDay: true, timeZone: props.domain.timeZone() })}</div>
        <Show when={ summaryResource() }>
          { summary => table(summary) }
        </Show>
        <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-around' }}>
          <button
            onClick={ () => props.domain.showLocationForecast(eventLat, eventLng, 'meteogram') }
            title="Meteogram for this location"
          >
            Meteogram
          </button>
          <button
            onClick={ () => props.domain.showLocationForecast(eventLat, eventLng, 'sounding') }
            title="Sounding for this time and location"
          >
            Sounding
          </button>
        </div>
      </div> as HTMLElement;
    props.openLocationDetailsPopup(latitude, longitude, content);
  });

  return [rootElement, layerKeyEl]
};

const table = (data: Array<[string, JSX.Element]>): JSX.Element => {
  const rows =
    data.map(([label, value]) => {
      return <tr><th>{label}:</th><td>{value}</td></tr>
    });
  if (rows.length === 0) {
    return <div></div>
  } else {
    return <table>
      <tbody>
        { rows }
      </tbody>
    </table>;
  }
};
