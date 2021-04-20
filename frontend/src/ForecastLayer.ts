import * as L from 'leaflet';
import { createEffect, createState, JSX } from 'solid-js';
import h from 'solid-js/h';

import { DataSource, CanvasLayer } from "./CanvasLayer";
import { Mixed } from './layers/Mixed';
import { Forecast, ForecastData } from './data/Forecast';
import { ThQ, colorScale as thQColorScale } from './layers/ThQ';
import { ColorScale } from './ColorScale';
import { CloudCover, cloudCoverColorScale } from './layers/CloudCover';
import { boundaryDepthColorScale, BoundaryLayerDepth } from './layers/BoundaryLayerDepth';
import { Wind, windColor } from './layers/Wind';
import { None } from './layers/None';
import { drawWindArrow } from './shapes';
import layersImg from './images/layers.png';
import { ForecastMetadata } from './data/ForecastMetadata';
import { Rain, rainColorScale } from './layers/Rain';

class Renderer {

  constructor(
    readonly name: string,
    readonly title: string,
    private readonly renderer: (forecast: Forecast) => DataSource,
    readonly mapKeyEl: () => HTMLElement
  ) {}

  update(forecastMetadata: ForecastMetadata, hourOffset: number, canvas: CanvasLayer) {
    fetch(`${forecastMetadata.initS}+${hourOffset}.json`)
      .then(response => response.json())
      .then((data: ForecastData) => canvas.setDataSource(this.renderer(new Forecast(data))))
      .catch(error => {
        console.error(error);
        alert('Unable to retrieve forecast data');
      })
  }

}

const colorScaleEl = (colorScale: ColorScale, format: (value: number) => string): HTMLElement => {
  return h(
    'div',
    colorScale.points.slice().reverse().map(([value, color]) => {
      return h(
        'div',
        { style: { margin: '5px', 'text-align': 'right' } },
        h('span', format(value)),
        h('span', { style: { width: '20px', height: '15px', 'background-color': color.css(), display: 'inline-block', border: 'thin solid black' } })
      )
    })
  )
};

const windScaleEl = (): HTMLElement => {
  return h(
    'div',
    [2.5, 5, 10, 17.5, 25].map((windSpeed) => {
      const canvas = h('canvas', { style: { width: '40px', height: '30px', border: 'thin solid black' } }) as HTMLCanvasElement;
      canvas.width = 40;
      canvas.height = 30;
      const ctx = canvas.getContext('2d');
      if (ctx == null) { return }
      drawWindArrow(ctx, canvas.width / 2, canvas.height / 2, canvas.width - 4, windColor(0.50), windSpeed, 0);
      return h(
        'div',
        { style: { margin: '5px', 'text-align': 'right' } },
        h('span', `${windSpeed} km/h `),
        canvas
      )
    })
  )
};

const noneRenderer = new Renderer(
  'None',
  'Map only',
  forecast => new None(forecast),
  () => h('div')
);
const thqRenderer = new Renderer(
  'Thermal Quality',
  'Thermal Quality',
  forecast => new ThQ(forecast),
  () => colorScaleEl(thQColorScale, value => `${Math.round(value * 100)}% `)
);
const boundaryLayerHeightRenderer = new Renderer(
  'Boundary Layer Depth',
  'Boundary layer depth',
  forecast => new BoundaryLayerDepth(forecast),
  // FIXME Maybe implement map key in datasource...
  () => colorScaleEl(boundaryDepthColorScale, value => `${value} m `)
);
const windRenderer = new Renderer(
  'Boundary Layer Wind',
  'Wind force and direction in the boundary layer',
  forecast => new Wind(forecast),
  windScaleEl
);
const cloudCoverRenderer = new Renderer(
  'Cloud Cover',
  'Cloud cover (all altitudes)',
  forecast => new CloudCover(forecast),
  () => colorScaleEl(cloudCoverColorScale, value => `${value}% `)
);
const rainRenderer = new Renderer(
  'Rain',
  'Total rain',
  forecast => new Rain(forecast),
  () => colorScaleEl(rainColorScale, value => `${value} mm `)
);
const mixedRenderer = new Renderer(
  'Mixed',
  'Boundary layer depth, wind, and cloud cover',
  forecast => new Mixed(forecast),
  () => h('div')
);

/**
 * Overlay on the map that displays the soaring forecast.
 */
export const ForecastLayer = (props: {
  hourOffset: number
  detailedView: 'meteogram' | 'sounding'
  forecasts: Array<ForecastMetadata>
  currentForecast: ForecastMetadata
  canvas: CanvasLayer
  onChangeDetailedView: (value: 'meteogram' | 'sounding') => void
  onChangeForecast: (value: ForecastMetadata) => void
}): JSX.Element => {
  // TODO Take as parameter the pre-selected layer
  const [state, setState] = createState({ renderer: mixedRenderer });

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

  const detailedViewEl = h(
    'fieldset',
    h('legend', 'Detailed View'),
    meteogramEl,
    soundingEl
  );

  const selectForecastEl = h(
    'fieldset',
    h('legend', 'Initialization Time'),
    () => props.forecasts
      .map(forecast => {
        const initTimeString =
          forecast.init.toLocaleString(undefined, { month: 'short', weekday: 'short', day: 'numeric', hour12: false, hour: 'numeric', minute: 'numeric' });
        const container = makeRadioBtn(
          initTimeString,
          `Show forecast initialized at ${initTimeString}.`,
          () => props.currentForecast === forecast,
          'init',
          () => props.onChangeForecast(forecast)
        )
        return container
      })
  );

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
  const windEl = setupRendererBtn(windRenderer);
  const cloudCoverEl = setupRendererBtn(cloudCoverRenderer);
  const rainEl = setupRendererBtn(rainRenderer);
  const mixedEl = setupRendererBtn(mixedRenderer);

  const layerEl = h(
    'fieldset',
    h('legend', 'Layer'),
    noneEl,
    thqEl,
    boundaryLayerHeightEl,
    windEl,
    cloudCoverEl,
    rainEl,
    mixedEl,
  );

  const selectEl = h(
    'div',
    { style: { display: 'none' } },
    detailedViewEl,
    selectForecastEl,
    layerEl
  );

  const layersBtn = h(
    'div',
    { style: {  } },
    h(
      'a',
      { style: { width: '44px', height: '44px', 'background-image': `url('${layersImg}')`, display: 'block', 'background-position': '50% 50%', 'background-repeat': 'no-repeat' } }
    )
  );

  const rootElement = h(
    'div',
    { style: { position: 'absolute', right: '3px', bottom: '100px', 'z-index': 1000 /* arbitrary value to be just above the zoom control */, background: 'white', border: '1px solid rgba(0, 0, 0, 0.2)', 'border-radius': '5px', 'user-select': 'none' } },
    layersBtn,
    selectEl
  ) as HTMLElement;

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

  const rendererKeyEl = h('div', { style: { position: 'absolute', bottom: '5px', left: '5px', 'z-index': 1000, 'background-color': 'rgba(255, 255,  255, 0.5' } });
  
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
  const input = h(
    'input',
    {
      name: groupName,
      type: 'radio',
      checked: () => checked(),
      onChange: () => onChange()
    }
  );
  const container = h(
    'div',
    { style: { 'background-color': 'rgba(255, 255, 255, 0.5)', 'text-align': 'right' } },
    h('label', { style: { cursor: 'pointer', padding: '0.3em' }, title: title }, label, input)
  );
  return container
}
