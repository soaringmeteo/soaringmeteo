import * as L from 'leaflet';
import { createEffect, JSX } from 'solid-js';
import { createStore } from 'solid-js/store';

import { DataSource, CanvasLayer } from "./CanvasLayer";
import { Mixed } from './layers/Mixed';
import { DetailedViewType } from './PeriodSelector';
import { Forecast } from './data/Forecast';
import { ThQ, colorScale as thQColorScale } from './layers/ThQ';
import { ColorScale } from './ColorScale';
import { CloudCover, cloudCoverColorScale } from './layers/CloudCover';
import { boundaryDepthColorScale, BoundaryLayerDepth } from './layers/BoundaryLayerDepth';
import { Wind, windColor } from './layers/Wind';
import { None } from './layers/None';
import { drawWindArrow } from './shapes';
import layersImg from './images/layers.png';
import { ForecastMetadata, showDate } from './data/ForecastMetadata';
import { Rain, rainColorScale } from './layers/Rain';

class Renderer {

  constructor(
    readonly name: string,
    readonly title: string,
    private readonly renderer: (forecast: Forecast) => DataSource,
    readonly mapKeyEl: JSX.Element
  ) {}

  update(forecastMetadata: ForecastMetadata, hourOffset: number, canvas: CanvasLayer) {
    forecastMetadata.fetchForecastAtHourOffset(hourOffset)
      .then(forecast => canvas.setDataSource(this.renderer(forecast)))
      .catch(error => {
        console.error(error);
        alert('Unable to retrieve forecast data');
      })
  }

}

const colorScaleEl = (colorScale: ColorScale, format: (value: number) => string): JSX.Element =>
  <div>
  {
    colorScale.points.slice().reverse().map(([value, color]) =>
      <div style={{ margin: '5px', 'text-align': 'right' }}>
        <span>{format(value)}</span>
        <span style={{ width: '20px', height: '15px', 'background-color': color.css(), display: 'inline-block', border: 'thin solid black' }} />
      </div>
    )
  }
  </div>;

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
  'Thermal Quality',
  'Thermal Quality',
  forecast => new ThQ(forecast),
  colorScaleEl(thQColorScale, value => `${Math.round(value * 100)}% `)
);
const boundaryLayerHeightRenderer = new Renderer(
  'Boundary Layer Depth',
  'Boundary layer depth',
  forecast => new BoundaryLayerDepth(forecast),
  // FIXME Maybe implement map key in datasource...
  colorScaleEl(boundaryDepthColorScale, value => `${value} m `)
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
  hourOffset: number
  detailedView: DetailedViewType
  forecasts: Array<ForecastMetadata>
  currentForecast: ForecastMetadata
  canvas: CanvasLayer
  onChangeDetailedView: (value: DetailedViewType) => void
  onChangeForecast: (value: ForecastMetadata) => void
}): JSX.Element => {
  // TODO Take as parameter the pre-selected layer
  const [state, setState] = createStore({ renderer: mixedRenderer });

  const meteogramEl = makeRadioBtn(
    'Meteogram',
    'Meteogram',
    () => props.detailedView === 'meteogram',
    'detailed-view',
    () => props.onChangeDetailedView('meteogram')
  );
  const soundingEl  = makeRadioBtn(
    'Sounding',
    'Sounding',
    () => props.detailedView === 'sounding',
    'detailed-view',
    () => props.onChangeDetailedView('sounding')
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
        props.forecasts.map(forecast => {
          const initTimeString = showDate(forecast.init, { showWeekDay: true });
          return makeRadioBtn(
            initTimeString,
            `Show forecast initialized at ${initTimeString}.`,
            () => props.currentForecast === forecast,
            'init',
            () => props.onChangeForecast(forecast)
          )
        })
      }
    </fieldset>;

  function setupRendererBtn(renderer: Renderer): HTMLElement {
    const container = makeRadioBtn(
      renderer.name,
      renderer.title,
      () => state.renderer === renderer,
      'layer',
      () => setState({ renderer })
    );
    return container
  }

  const noneEl = setupRendererBtn(noneRenderer);
  const thqEl = setupRendererBtn(thqRenderer);
  const boundaryLayerHeightEl = setupRendererBtn(boundaryLayerHeightRenderer);

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
  const rainEl = setupRendererBtn(rainRenderer);
  const mixedEl = setupRendererBtn(mixedRenderer);

  const layerEl =
    <fieldset>
      <legend>Layer</legend>
      {noneEl}
      {thqEl}
      {boundaryLayerHeightEl}
      {windLayersEl}
      {cloudCoverEl}
      {rainEl}
      {mixedEl}
    </fieldset>;

  const selectEl =
    <div style={{ display: 'none' }}>
      {detailedViewEl}
      {selectForecastEl}
      {layerEl}
    </div>;

  const layersBtn =
    <div>
      <a style={{ width: '44px', height: '44px', 'background-image': `url('${layersImg}')`, display: 'block', 'background-position': '50% 50%', 'background-repeat': 'no-repeat' }} />
    </div>;

  const rootElement =
    <div style={{ position: 'absolute', right: '3px', bottom: '100px', 'z-index': 1000 /* arbitrary value to be just above the zoom control */, background: 'white', border: '1px solid rgba(0, 0, 0, 0.2)', 'border-radius': '5px', 'user-select': 'none' }}>
      {layersBtn}
      {selectEl}
    </div>;

  rootElement.onmouseenter = _ => {
    selectEl.style.display = 'unset';
    layersBtn.style.display = 'none';
  };

  rootElement.onmouseleave = _ => {
    selectEl.style.display = 'none';
    layersBtn.style.display = 'unset';
  };

  L.DomEvent.disableClickPropagation(rootElement);
  L.DomEvent.disableScrollPropagation(rootElement);

  const rendererKeyEl =
    <div style={{ position: 'absolute', bottom: '30px', left: '5px', 'z-index': 1000, 'background-color': 'rgba(255, 255,  255, 0.5' }}>
      {state.renderer.mapKeyEl}
    </div>;
  
  createEffect(() => {
    state.renderer.update(props.currentForecast, props.hourOffset, props.canvas);
  })

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
