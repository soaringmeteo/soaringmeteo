import * as L from 'leaflet';
import { Accessor, createEffect, createMemo, createSignal, JSX, Match, Show, Switch } from 'solid-js';

import { DataSource, CanvasLayer, viewPoint } from "./CanvasLayer";
import { Mixed } from './layers/Mixed';
import { Forecast, normalizeCoordinates } from './data/Forecast';
import { ThQ, colorScale as thQColorScale } from './layers/ThQ';
import { Color, ColorScale } from './ColorScale';
import { CloudCover, cloudCoverColorScale } from './layers/CloudCover';
import { boundaryDepthColorScale, BoundaryLayerDepth } from './layers/BoundaryLayerDepth';
import { Wind, windColor } from './layers/Wind';
import { None } from './layers/None';
import { closeButtonStyle, drawWindArrow } from './shapes';
import layersImg from './images/layers.png';
import { ForecastMetadata, showDate } from './data/ForecastMetadata';
import { Rain, rainColorScale } from './layers/Rain';
import { ThermalVelocity, thermalVelocityColorScale } from './layers/ThermalVelocity';
import { CumuliDepth, colorScale as cumuliDepthColorScale } from './layers/CumuliDepth';
import { useState } from './State';

class Renderer {

  constructor(
    readonly name: string,
    readonly title: string,
    readonly createDataSource: (forecast: Forecast) => DataSource,
    readonly mapKeyEl: JSX.Element
  ) {}

}

const colorScaleEl = (colorScale: ColorScale, format: (value: number) => string): JSX.Element => {
  const colorsAndValues: Array<[Color, string]> = colorScale.points.slice().reverse().map(([value, color]) => [color, format(value)]);
  const length = colorsAndValues.reduce((n, [_, s]) => s.length > n ? s.length : n, 0);
  return <div style={{ 'margin': '1em 0.5em 0.5em 0.5em', width: `${length * 2 / 3}em` }}>
  {
    colorsAndValues.map(([color, value]) =>
      <div style={{ height: '2em', 'background-color': color.css(), position: 'relative' }}>
        <span style={{ position: 'absolute', top: '-.6em', right: '0.5em', 'text-shadow': 'white 1px 1px 2px' }}>{value}</span>
      </div>
    )
  }
  </div>
  };

const windScaleEl: JSX.Element =
  <div>
    {
      [2.5, 5, 10, 17.5, 25].map((windSpeed) => {
        const canvas = <canvas style={{ width: '40px', height: '30px', border: 'thin solid black' }} /> as HTMLCanvasElement;
        canvas.width = 40;
        canvas.height = 30;
        const ctx = canvas.getContext('2d');
        if (ctx === null) { return }
        drawWindArrow(ctx, canvas.width / 2, canvas.height / 2, canvas.width - 4, windColor(0.50), windSpeed, 0);
        return (
          <div style={{ margin: '5px', 'text-align': 'right' }}>
            <span>{`${windSpeed} km/h `}</span>
            {canvas}
          </div>
        )
      })
    }
  </div>;

const noneRenderer = new Renderer(
  'None',
  'Map only',
  forecast => new None(forecast),
  <div />
);
const thqRenderer = new Renderer(
  'XC Flying Potential',
  'XC flying potential',
  forecast => new ThQ(forecast),
  colorScaleEl(thQColorScale, value => `${value}% `)
);
const boundaryLayerHeightRenderer = new Renderer(
  'Boundary Layer Depth',
  'Boundary layer depth',
  forecast => new BoundaryLayerDepth(forecast),
  // FIXME Maybe implement map key in datasource...
  colorScaleEl(boundaryDepthColorScale, value => `${value} m `)
);
const thermalVelocityRenderer = new Renderer(
  'Thermal Velocity',
  'Thermal updraft velocity',
  forecast => new ThermalVelocity(forecast),
  colorScaleEl(thermalVelocityColorScale, value => `${value} m/s `)
);
const surfaceWindRenderer = new Renderer(
  'Surface',
  'Wind force and direction on the ground',
  forecast => new Wind(forecast, (point) => [point.uSurfaceWind, point.vSurfaceWind]),
  windScaleEl
);
const _300MAGLWindRenderer = new Renderer(
  '300 m AGL',
  'Wind force and direction at 300 m above the ground level',
  forecast => new Wind(forecast, (forecast) => [forecast.u300MWind, forecast.v300MWind]),
  windScaleEl
);
const boundaryLayerWindRenderer = new Renderer(
  'Boundary Layer',
  'Average wind force and direction in the boundary layer',
  forecast => new Wind(forecast, (point) => [point.uWind, point.vWind]),
  windScaleEl
);
const boundaryLayerTopWindRenderer = new Renderer(
  'Boundary Layer Top',
  'Wind force and direction at the top of the boundary layer',
  forecast => new Wind(forecast, (point) => [point.uBLTopWind, point.vBLTopWind]),
  windScaleEl
);
const cloudCoverRenderer = new Renderer(
  'Cloud Cover',
  'Cloud cover (all altitudes)',
  forecast => new CloudCover(forecast),
  colorScaleEl(cloudCoverColorScale, value => `${value}% `)
);
const cumuliDepthRenderer = new Renderer(
  'Convective Clouds',
  'Convective Clouds Depth',
  forecast => new CumuliDepth(forecast),
  colorScaleEl(cumuliDepthColorScale, value => `${value} m `)
);
const rainRenderer = new Renderer(
  'Rain',
  'Total rain',
  forecast => new Rain(forecast),
  colorScaleEl(rainColorScale, value => `${value} mm `)
);
const mixedRenderer = new Renderer(
  'Mixed',
  'Boundary layer depth, wind, and cloud cover',
  forecast => new Mixed(forecast),
  <div />
);

/**
 * Overlay on the map that displays the soaring forecast.
 */
export const ForecastLayer = (props: {
  forecastMetadatas: Array<ForecastMetadata>
  canvas: CanvasLayer
  popupRequest: Accessor<undefined | L.LeafletMouseEvent>
  openLocationDetailsPopup: (latitude: number, longitude: number, content: JSX.Element) => void
}): JSX.Element => {

  const [state, { setDetailedView, setForecastMetadata, fetchLocationForecasts }] = useState();

  const [isMenuShown, showMenu] = createSignal(false);
  // TODO Move to global state
  const [selectedRenderer, selectRenderer] = createSignal(thqRenderer);

  const meteogramEl = makeRadioBtn(
    'Meteogram',
    'Meteogram',
    () => state.detailedView === 'meteogram',
    'detailed-view',
    () => setDetailedView('meteogram')
  );
  const soundingEl = makeRadioBtn(
    'Sounding',
    'Sounding',
    () => state.detailedView === 'sounding',
    'detailed-view',
    () => setDetailedView('sounding')
  );

  const detailedViewEl =
    <fieldset>
      <legend>Detailed View</legend>
      {meteogramEl}
      {soundingEl}
    </fieldset>;

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
            () => setForecastMetadata(forecastMetadata)
          )
        })
      }
    </fieldset>;

  function setupRendererBtn(renderer: Renderer): HTMLElement {
    const container = makeRadioBtn(
      renderer.name,
      renderer.title,
      () => selectedRenderer() === renderer,
      'layer',
      () => selectRenderer(renderer)
    );
    return container
  }

  const noneEl = setupRendererBtn(noneRenderer);
  const mixedEl = setupRendererBtn(mixedRenderer);
  const thqEl = setupRendererBtn(thqRenderer);

  const boundaryLayerHeightEl = setupRendererBtn(boundaryLayerHeightRenderer);
  const thermalVelocityEl = setupRendererBtn(thermalVelocityRenderer);
  const thermalLayersEl =
    <fieldset>
      <legend>Thermals</legend>
      {boundaryLayerHeightEl}
      {thermalVelocityEl}
    </fieldset>;

  const blWindEl = setupRendererBtn(boundaryLayerWindRenderer);
  const blTopWindEl = setupRendererBtn(boundaryLayerTopWindRenderer);
  const surfaceWindEl = setupRendererBtn(surfaceWindRenderer);
  const _300MAGLWindEl = setupRendererBtn(_300MAGLWindRenderer);
  const windLayersEl =
    <fieldset>
      <legend>Wind</legend>
      {surfaceWindEl}
      {_300MAGLWindEl}
      {blWindEl}
      {blTopWindEl}
    </fieldset>;

  const cloudCoverEl = setupRendererBtn(cloudCoverRenderer);
  const cumuliDepthEl = setupRendererBtn(cumuliDepthRenderer);
  const rainEl = setupRendererBtn(rainRenderer);
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
      {mixedEl}
      {thermalLayersEl}
      {windLayersEl}
      {cloudsLayersEl}
    </fieldset>;

  const aboveMapStyle = { position: 'absolute', 'z-index': 1000 /* arbitrary value to be just above the zoom control */, 'user-select': 'none' };

  const selectEl =
    <Show when={ isMenuShown() }>
      <div style={{ ...aboveMapStyle, right: '3px', bottom: '136px', 'background-color': 'white' }}>
        {detailedViewEl}
        {selectForecastEl}
        {layerEl}
      </div>
    </Show>;

  const layersBtn =
    <Switch>
      <Match when={ isMenuShown() }>
        <div
          onClick={ () => showMenu(false) }
          style={{ ...aboveMapStyle, ...closeButtonStyle, right: '8px', bottom: '100px' }}
        >X</div>
      </Match>
      <Match when={ !isMenuShown() }>
      <div
        onClick={ () => showMenu(true) }
        style={{ ...aboveMapStyle, right: '3px', bottom: '100px', width: '44px', height: '44px', 'line-height': '44px', color: 'black', display: 'block', cursor: 'pointer', 'text-align': 'center', 'background-image': `url('${layersImg}')`, 'background-position': '50% 50%', 'background-repeat': 'no-repeat', 'background-color': 'white', border: '1px solid rgba(0, 0, 0, 0.2)', 'border-radius': '4px', 'box-shadow': '0 2px 2px 0 rgba(0,0,0,0.14),0 3px 1px -2px rgba(0,0,0,0.12),0 1px 5px 0 rgba(0,0,0,0.2)' }}
      />
      </Match>
    </Switch>;

  const rootElement =
    <div>
      {selectEl}
      {layersBtn}
    </div>;

  L.DomEvent.disableClickPropagation(rootElement);
  L.DomEvent.disableScrollPropagation(rootElement);

  const rendererKeyEl =
    <div style={{ position: 'absolute', bottom: '30px', left: '5px', 'z-index': 1000, 'background-color': 'rgba(255, 255,  255, 0.5' }}>
      {selectedRenderer().mapKeyEl}
    </div>;

  // Sync data source (used to display the map overlay and tooltips) with current forecast
  const dataSource =
    createMemo(() => selectedRenderer().createDataSource(state.forecast));

  createEffect(() => {
    props.canvas.setDataSource(dataSource());
  });

  // Show a popup with a summary when the user clicks on the map
  createEffect(() => {
    const event = props.popupRequest();
    if (event !== undefined) {
      const [normalizedLatitude, normalizedLongitude] = normalizeCoordinates(event.latlng.lat, event.latlng.lng);
      const [latitude, longitude] = [normalizedLatitude / 100, normalizedLongitude / 100];
      const forecastAtPoint = viewPoint(state.forecast, 1 /* TODO handle averaging */, normalizedLatitude, normalizedLongitude);
      if (forecastAtPoint !== undefined) {
        const content =
          <div>
            <div>Grid point: {latitude},{longitude}</div>
            <div>GFS forecast for {showDate(state.forecastMetadata.dateAtHourOffset(state.hourOffset), { showWeekDay: true })}</div>
            { dataSource().summary(forecastAtPoint) }
            <button onClick={ () => fetchLocationForecasts(event.latlng.lat, event.latlng.lng) }>
              { state.detailedView == 'meteogram' ? "Meteogram for this location" : "Sounding for this time and location" }
            </button>
          </div>
        props.openLocationDetailsPopup(latitude, longitude, content);
      }
    }
  });

  return [rootElement, rendererKeyEl]
};

const makeRadioBtn = (
  label: string,
  title: string,
  checked: () => boolean,
  groupName: string,
  onChange: () => void
): HTMLElement => {
  const input =
    <input
      name={groupName}
      type='radio'
      checked={checked()}
      onChange={() => onChange()}
  />;
  return (
    <div style={{ 'background-color': 'rgba(255, 255, 255, 0.5)', 'text-align': 'right' }}>
      <label style={{ cursor: 'pointer', padding: '0.3em' }} title={title}>{label}{input}</label>
    </div>
  )
}
