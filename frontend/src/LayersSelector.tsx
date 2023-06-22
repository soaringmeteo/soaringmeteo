import * as L from 'leaflet';
import { Accessor, createEffect, createSignal, JSX, Match, Show, Switch } from 'solid-js';

import { CanvasLayer } from "./map/CanvasLayer";
import { normalizeCoordinates } from './data/LocationForecasts';
import { closeButton, surfaceOverMap } from './styles/Styles';
import layersImg from '../node_modules/leaflet/dist/images/layers.png';
import { ForecastMetadata } from './data/ForecastMetadata';
import { Domain } from './State';
import { Layer } from './layers/Layer';
import { noLayer } from './layers/None';
import { xcFlyingPotentialLayer } from './layers/ThQ';
import { soaringLayerDepthLayer } from './layers/SoaringLayerDepth';
import { boundaryLayerWindLayer, soaringLayerTopWindLayer, surfaceWindLayer, _2000MAMSLWindLayer, _3000MAMSLWindLayer, _300MAGLWindLayer, _4000MAMSLWindLayer } from './layers/Wind';
import { cloudCoverLayer } from './layers/CloudCover';
import { thermalVelocityLayer } from './layers/ThermalVelocity';
import { rainLayer } from './layers/Rain';
import { cumuliDepthLayer } from './layers/CumuliDepth';
import { showDate } from './shared';
import { Labelled, Radio } from './styles/Forms';

/**
 * Overlay on the map that displays the soaring forecast.
 */
export const LayersSelector = (props: {
  forecastMetadatas: Array<ForecastMetadata>
  canvas: CanvasLayer
  popupRequest: Accessor<undefined | L.LeafletMouseEvent>
  openLocationDetailsPopup: (latitude: number, longitude: number, content: HTMLElement) => void
  domain: Domain
}): JSX.Element => {

  const state = props.domain.state;

  const [isMenuShown, showMenu] = createSignal(false);

  const selectForecastEl =
    <fieldset>
      <legend>Initialization Time</legend>
      {
        props.forecastMetadatas.map(forecastMetadata => {
          const initTimeString =
            showDate(
              forecastMetadata.init,
              { showWeekDay: true, timeZone: props.domain.timeZone() }
            );
          return <Radio
            label={ initTimeString }
            title={ `Show forecast initialized at ${initTimeString}.` }
            checked={ state.forecastMetadata === forecastMetadata }
            groupName='init'
            onChange={ () => props.domain.setForecastMetadata(forecastMetadata) }
          />
        })
      }
    </fieldset>;

  function setupLayerBtn(layer: Layer, layerType: 'primary-layer' | 'wind-layer'): JSX.Element {
    const container = <Radio
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
    return container
  }

  const noneEl = setupLayerBtn(noLayer, 'primary-layer');
  const thqEl = setupLayerBtn(xcFlyingPotentialLayer, 'primary-layer');

  const boundaryLayerHeightEl = setupLayerBtn(soaringLayerDepthLayer, 'primary-layer');
  const thermalVelocityEl = setupLayerBtn(thermalVelocityLayer, 'primary-layer');
  const thermalLayersEl =
    <fieldset>
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
  const windCheckBox = <Labelled
    label='Wind'
    title='Show wind force and direction at various elevation levels'
  >
    <input
      type='checkbox'
      checked={state.windLayerEnabled}
      onChange={() => props.domain.enableWindLayer(!state.windLayerEnabled)}
    />
  </Labelled>;
  const windLayersEl =
    <fieldset>
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
    <fieldset>
      <legend>Clouds and Rain</legend>
      {cloudCoverEl}
      {cumuliDepthEl}
      {rainEl}
    </fieldset>

  const layerEl =
    <fieldset>
      <legend>Layer</legend>
      {noneEl}
      {thqEl}
      {thermalLayersEl}
      {cloudsLayersEl}
      {windLayersEl}
    </fieldset>;

  const aboveMapStyle = { ...surfaceOverMap, position: 'absolute', 'z-index': 1000 /* arbitrary value to be just above the zoom control */, 'user-select': 'none' };

  const layersBtn =
    <Switch>
      <Match when={ isMenuShown() }>
        <div style={{ ...aboveMapStyle, right: '3px', bottom: '128px', 'background-color': 'white' } as JSX.CSSProperties}>
          {selectForecastEl}
          {layerEl}
        </div>
        <div
          onClick={ () => showMenu(false) }
          style={{ ...aboveMapStyle, ...closeButton, right: '12px', bottom: '90px' } as JSX.CSSProperties}
        >⨯</div>
      </Match>
      <Match when={ !isMenuShown() }>
        <div
          onClick={ () => showMenu(true) }
          style={{ ...aboveMapStyle, right: '5px', bottom: '86px', width: '44px', height: '44px', 'line-height': '44px', color: 'black', display: 'block', cursor: 'pointer', 'text-align': 'center', 'background-image': `url('${layersImg}')`, 'background-position': '50% 50%', 'background-repeat': 'no-repeat', 'background-color': 'white', border: '1px solid rgba(0, 0, 0, 0.2)', 'border-radius': '4px' } as JSX.CSSProperties}
        />
      </Match>
    </Switch>;

  // Wrapper element so that we can disable event propagation below
  const rootElement =
    <div>
      {layersBtn}
    </div> as HTMLElement;

  L.DomEvent.disableClickPropagation(rootElement);
  L.DomEvent.disableScrollPropagation(rootElement);

  const primaryLayerComponents = () => props.domain.primaryLayerReactiveComponents();
  const windLayerComponents    = () => props.domain.windLayerReactiveComponents();

  const layerKeyEl =
    <div style={{
      position: 'absolute',
      bottom: '30px',
      left: '5px',
      'z-index': 1000,
      'background-color': 'rgba(255, 255,  255, 0.5',
      'font-size': '11px',
      'padding': '5px',
      'text-align': 'center'
    }}>
      <Show when={state.windLayerEnabled}>
        {windLayerComponents().mapKey}
      </Show>
      {primaryLayerComponents().mapKey}
    </div>;

  createEffect(() => {
    const primaryRenderer = primaryLayerComponents().renderer();
    const windRenderer    = windLayerComponents().renderer();
    if (state.windLayerEnabled) {
      if (primaryRenderer !== undefined && windRenderer !== undefined) {
        props.canvas.setRenderers(primaryRenderer, windRenderer);
      }
    } else {
      if (primaryRenderer !== undefined) {
        props.canvas.setRenderers(primaryRenderer, undefined);
      }
    }
  });

  // Show a popup with a summary when the user clicks on the map
  createEffect(() => {
    const event = props.popupRequest();
    if (event !== undefined) {
      const [normalizedLatitude, normalizedLongitude] = normalizeCoordinates(event.latlng.lat, event.latlng.lng);
      const [latitude, longitude] = [normalizedLatitude / 100, normalizedLongitude / 100];
      const summaryPromise =
        state.windLayerEnabled ?
          Promise.all([
            primaryLayerComponents().summarizer().summary(normalizedLatitude, normalizedLongitude),
            windLayerComponents().summarizer().summary(normalizedLatitude, normalizedLongitude)
          ])
            .then(([primarySummary, windSummary]) => primarySummary?.concat(windSummary || [])) :
          primaryLayerComponents().summarizer().summary(normalizedLatitude, normalizedLongitude);
      summaryPromise.then(summary => {
        if (summary !== undefined && summary.length !== 0) {
          const content =
            <div>
              <div>Grid point: {latitude},{longitude}</div>
              <div>GFS forecast for {showDate(state.forecastMetadata.dateAtHourOffset(state.hourOffset), { showWeekDay: true, timeZone: props.domain.timeZone() })}</div>
              { table(summary) }
              <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-around' }}>
                <button
                  onClick={ () => props.domain.showLocationForecast(event.latlng.lat, event.latlng.lng, 'meteogram') }
                  title="Meteogram for this location"
                >
                  Meteogram
                </button>
                <button
                  onClick={ () => props.domain.showLocationForecast(event.latlng.lat, event.latlng.lng, 'sounding') }
                  title="Sounding for this time and location"
                >
                  Sounding
                </button>
              </div>
            </div> as HTMLElement;
          props.openLocationDetailsPopup(latitude, longitude, content);
        }
      });
    }
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
