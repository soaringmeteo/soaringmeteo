import * as L from 'leaflet';
import { Accessor, createEffect, createMemo, createSignal, JSX, Match, Show, Switch } from 'solid-js';

import { Renderer, CanvasLayer, viewPoint } from "./map/CanvasLayer";
import { normalizeCoordinates } from './data/Forecast';
import { closeButton, surfaceOverMap } from './styles/Styles';
import layersImg from './images/layers.png';
import { ForecastMetadata, showDate } from './data/ForecastMetadata';
import { boundaryLayerDepthKey, boundaryLayerTopWindKey, boundaryLayerWindKey, cloudCoverKey, cumuliDepthKey, noneKey, rainKey, Domain, surfaceWindKey, thermalVelocityKey, xcFlyingPotentialKey, _300MAGLWindKey } from './State';
import { Layers } from './layers/Layers';

/**
 * Overlay on the map that displays the soaring forecast.
 */
export const LayersSelector = (props: {
  forecastMetadatas: Array<ForecastMetadata>
  canvas: CanvasLayer
  popupRequest: Accessor<undefined | L.LeafletMouseEvent>
  openLocationDetailsPopup: (latitude: number, longitude: number, content: JSX.Element) => void
  domain: Domain
  layers: Layers
}): JSX.Element => {

  const state = props.domain.state;

  const [isMenuShown, showMenu] = createSignal(false);

  const selectForecastEl =
    <fieldset>
      <legend>Initialization Time</legend>
      {
        props.forecastMetadatas.map(forecastMetadata => {
          const initTimeString = showDate(forecastMetadata.init, { showWeekDay: true });
          return makeRadioBtn(
            initTimeString,
            `Show forecast initialized at ${initTimeString}.`,
            () => state.forecastMetadata === forecastMetadata,
            'init',
            () => props.domain.setForecastMetadata(forecastMetadata)
          )
        })
      }
    </fieldset>;

  function setupLayerBtn(key: string, layerType: 'primary-layer' | 'wind-layer'): JSX.Element {
    const layer = props.layers.layerByKey(key);
    if (layer === undefined) {
      throw new Error(`Invalid layer key: ${key}`);
    }
    const container = makeRadioBtn(
      layer.name,
      layer.title,
      () => state.primaryLayerKey === layer.key || state.windLayerKey === layer.key,
      layerType,
      () => {
        switch(layerType) {
          case 'primary-layer':
            props.domain.setPrimaryLayer(key);
            break;
          case 'wind-layer':
            props.domain.setWindLayer(key);
            break;
        }
      }
    );
    return container
  }

  const noneEl = setupLayerBtn(noneKey, 'primary-layer');
  const thqEl = setupLayerBtn(xcFlyingPotentialKey, 'primary-layer');

  const boundaryLayerHeightEl = setupLayerBtn(boundaryLayerDepthKey, 'primary-layer');
  const thermalVelocityEl = setupLayerBtn(thermalVelocityKey, 'primary-layer');
  const thermalLayersEl =
    <fieldset>
      <legend>Thermals</legend>
      {boundaryLayerHeightEl}
      {thermalVelocityEl}
    </fieldset>;

  const blWindEl = setupLayerBtn(boundaryLayerWindKey, 'wind-layer');
  const blTopWindEl = setupLayerBtn(boundaryLayerTopWindKey, 'wind-layer');
  const surfaceWindEl = setupLayerBtn(surfaceWindKey, 'wind-layer');
  const _300MAGLWindEl = setupLayerBtn(_300MAGLWindKey, 'wind-layer');
  const windCheckBox = inputWithLabel(
    'Wind',
    'Show wind force and direction at various elevation levels',
    <input
      type='checkbox'
      checked={state.windLayerEnabled}
      onChange={() => props.domain.enableWindLayer(!state.windLayerEnabled)}
    />
  );
  const windNumericValuesCheckBox = inputWithLabel(
    'Numerical values',
    'Show numerical values instead of barbells',
    <input
      type='checkbox'
      checked={state.windNumericValuesShown}
      onChange={() => props.domain.showWindNumericValues(!state.windNumericValuesShown)}
    />
  );
  const windLayersEl =
    <fieldset>
      <legend>{windCheckBox}</legend>
      {surfaceWindEl}
      {_300MAGLWindEl}
      {blWindEl}
      {blTopWindEl}
      {windNumericValuesCheckBox}
    </fieldset>;

  const cloudCoverEl = setupLayerBtn(cloudCoverKey, 'primary-layer');
  const cumuliDepthEl = setupLayerBtn(cumuliDepthKey, 'primary-layer');
  const rainEl = setupLayerBtn(rainKey, 'primary-layer');
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
        <div style={{ ...aboveMapStyle, right: '3px', bottom: '128px', 'background-color': 'white' }}>
          {selectForecastEl}
          {layerEl}
        </div>
        <div
          onClick={ () => showMenu(false) }
          style={{ ...aboveMapStyle, ...closeButton, right: '12px', bottom: '90px' }}
        >⨯</div>
      </Match>
      <Match when={ !isMenuShown() }>
        <div
          onClick={ () => showMenu(true) }
          style={{ ...aboveMapStyle, right: '5px', bottom: '86px', width: '44px', height: '44px', 'line-height': '44px', color: 'black', display: 'block', cursor: 'pointer', 'text-align': 'center', 'background-image': `url('${layersImg}')`, 'background-position': '50% 50%', 'background-repeat': 'no-repeat', 'background-color': 'white', border: '1px solid rgba(0, 0, 0, 0.2)', 'border-radius': '4px' }}
        />
      </Match>
    </Switch>;

  // Wrapper element so that we can disable event propagation below
  const rootElement =
    <div>
      {layersBtn}
    </div>;

  L.DomEvent.disableClickPropagation(rootElement);
  L.DomEvent.disableScrollPropagation(rootElement);

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
      <Show when={state.windLayerEnabled && props.layers.layerByKey(state.windLayerKey)}>
        { windLayer => windLayer.mapKeyEl }
      </Show>
      <Show when={props.layers.layerByKey(state.primaryLayerKey)}>
        { primaryLayer => primaryLayer.mapKeyEl }
      </Show>
    </div>;

  // Sync renderers (used to display the map overlay and tooltips) with current forecast
  const primaryRenderer =
    createMemo<Renderer>(() => {
      const primaryLayer = props.layers.layerByKey(state.primaryLayerKey);
      if (primaryLayer === undefined) {
        throw new Error('Implementation error')
      } else {
        return primaryLayer.createRenderer(state.forecast)
      }
    });
  const windRenderer =
    createMemo<undefined | Renderer>(() => {
      if (state.windLayerEnabled) {
        const windLayer = props.layers.layerByKey(state.windLayerKey);
        if (windLayer === undefined) {
          return undefined
        } else {
          return windLayer.createRenderer(state.forecast)
        }
      } else {
        return undefined
      }
    });

  createEffect(() => {
    props.canvas.setRenderers(primaryRenderer(), windRenderer());
  });

  // Show a popup with a summary when the user clicks on the map
  createEffect(() => {
    const event = props.popupRequest();
    if (event !== undefined) {
      const [normalizedLatitude, normalizedLongitude] = normalizeCoordinates(event.latlng.lat, event.latlng.lng);
      const [latitude, longitude] = [normalizedLatitude / 100, normalizedLongitude / 100];
      const forecastAtPoint = viewPoint(state.forecast, 1 /* TODO handle averaging */, normalizedLatitude, normalizedLongitude);
      if (forecastAtPoint !== undefined) {
        const primaryRendererSummary = primaryRenderer().summary(forecastAtPoint);
        const windRendererSummary = windRenderer()?.summary(forecastAtPoint);
        const summary =
          windRendererSummary === undefined ? primaryRendererSummary : primaryRendererSummary.concat(windRendererSummary);
        const content =
          <div>
            <div>Grid point: {latitude},{longitude}</div>
            <div>GFS forecast for {showDate(state.forecastMetadata.dateAtHourOffset(state.hourOffset), { showWeekDay: true })}</div>
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
          </div>
        props.openLocationDetailsPopup(latitude, longitude, content);
      }
    }
  });

  return [rootElement, layerKeyEl]
};

const makeRadioBtn = (
  label: string,
  title: string,
  checked: () => boolean,
  groupName: string,
  onChange: () => void
): JSX.Element =>
  inputWithLabel(
    label,
    title,
    <input
      name={groupName}
      type='radio'
      checked={checked()}
      onChange={() => onChange()}
    />
  );

const inputWithLabel = (
  label: string,
  title: string,
  input: JSX.Element
): JSX.Element =>
  <div style={{ 'background-color': 'rgba(255, 255, 255, 0.5)', 'text-align': 'right' }}>
    <label style={{ cursor: 'pointer', padding: '0.3em' }} title={title}>{label}{input}</label>
  </div>;

const table = (data: Array<[string, string]>): JSX.Element => {
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
