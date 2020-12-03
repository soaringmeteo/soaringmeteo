import { el, mount, setChildren } from 'redom';
import { DataSource, CanvasLayer } from "./CanvasLayer";
import * as L from 'leaflet';
import { Mixed } from './layers/Mixed';
import { Forecast, ForecastData } from './Forecast';
import { ThQ, colorScale as thQColorScale } from './layers/ThQ';
import { App } from './App';
import { ColorScale } from './ColorScale';
import { CloudCover, cloudCoverColorScale } from './layers/CloudCover';
import { boundaryDepthColorScale, BoundaryLayerDepth } from './layers/BoundaryLayerDepth';
import { Wind, windColor } from './layers/Wind';
import { None } from './layers/None';
import { drawWindArrow } from './shapes';
import layersImg from './images/layers.png';

class Renderer {

  constructor(
    readonly name: string,
    readonly title: string,
    private readonly renderer: (forecast: Forecast) => DataSource,
    readonly mapKeyEl: () => HTMLElement
  ) {}

  update(hourOffset: number, canvas: CanvasLayer) {
    fetch(`${hourOffset}.json`)
      .then(response => response.json())
      .then((data: ForecastData) => canvas.setDataSource(this.renderer(new Forecast(data))))
      .catch(error => {
        console.error(error);
        alert('Unable to retrieve forecast data');
      })
  }

}

const colorScaleEl = (colorScale: ColorScale, format: (value: number) => string): HTMLElement => {
  return el(
    'div',
    colorScale.points.slice().reverse().map(([value, color]) => {
      return el(
        'div',
        { style: { margin: '5px', textAlign: 'right' } },
        el('span', format(value)),
        el('span', { style: { width: '20px', height: '15px', backgroundColor: color.css(), display: 'inline-block', border: 'thin solid black' } })
      )
    })
  )
};

const windScaleEl = (): HTMLElement => {
  return el(
    'div',
    [2.5, 5, 10, 17.5, 25].map((windSpeed) => {
      const canvas = el('canvas', { style: { width: '40px', height: '30px', border: 'thin solid black' } }) as HTMLCanvasElement;
      canvas.width = 40;
      canvas.height = 30;
      const ctx = canvas.getContext('2d');
      if (ctx == null) { return }
      drawWindArrow(ctx, canvas.width / 2, canvas.height / 2, canvas.width - 4, windColor(0.50), windSpeed, 0);
      return el(
        'div',
        { style: { margin: '5px', textAlign: 'right' } },
        el('span', `${windSpeed} km/h `),
        canvas
      )
    })
  )
};

const noneRenderer = new Renderer(
  'None',
  'Map only',
  forecast => new None(forecast),
  () => el('div')
);
const thqRenderer = new Renderer(
  'ThQ',
  'Thermal Quality',
  forecast => new ThQ(forecast),
  () => colorScaleEl(thQColorScale, value => `${Math.round(value * 100)}% `)
);
const boundaryLayerHeightRenderer = new Renderer(
  'BLD',
  'Boundary layer depth',
  forecast => new BoundaryLayerDepth(forecast),
  // FIXME Maybe implement map key in datasource...
  () => colorScaleEl(boundaryDepthColorScale, value => `${value}m `)
);
const windRenderer = new Renderer(
  'Wind',
  'Wind force and direction',
  forecast => new Wind(forecast),
  windScaleEl
);
const cloudCoverRenderer = new Renderer(
  'Clouds',
  'Cloud cover',
  forecast => new CloudCover(forecast),
  () => colorScaleEl(cloudCoverColorScale, value => `${value}% `)
);
const mixedRenderer = new Renderer(
  'Mixed',
  'Boundary layer depth, wind, and cloud cover',
  forecast => new Mixed(forecast),
  () => el('div')
);

/**
 * Overlay on the map that displays the soaring forecast.
 */
export class ForecastLayer {

  private renderer: Renderer;
  private rendererKeyEl: HTMLElement;

  // TODO Take as parameter the pre-selected layer
  constructor(readonly app: App, containerElement: HTMLElement) {
    this.renderer = mixedRenderer;

    const noneEl = this.setupRendererBtn(noneRenderer);
    const thqEl = this.setupRendererBtn(thqRenderer);
    const boundaryLayerHeightEl = this.setupRendererBtn(boundaryLayerHeightRenderer);
    const windEl = this.setupRendererBtn(windRenderer);
    const cloudCoverEl = this.setupRendererBtn(cloudCoverRenderer);
    const mixedEl = this.setupRendererBtn(mixedRenderer);

    const selectEl = el(
      'div',
      { style: { display: 'none' } },
      noneEl,
      thqEl,
      boundaryLayerHeightEl,
      windEl,
      cloudCoverEl,
      mixedEl
    );

    const layersBtn = el(
      'div',
      { style: {  } },
      el(
        'a',
        { style: { width: '44px', height: '44px', backgroundImage: `url('${layersImg}')`, display: 'block', backgroundPosition: '50% 50%', backgroundRepeat: 'no-repeat' } }
      )
    );

    const rootElement = el(
      'div',
      { style: { position: 'absolute', right: '3px', bottom: '100px', zIndex: 1000 /* arbitrary value to be just above the zoom control */, background: 'white', border: '1px solid rgba(0, 0, 0, 0.2)', borderRadius: '5px' } },
      layersBtn,
      selectEl
    );

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
    mount(containerElement, rootElement);

    this.rendererKeyEl = el('div', { style: { position: 'absolute', bottom: '5px', left: '5px', zIndex: 1000, backgroundColor: 'rgba(255, 255,  255, 0.5' } });
    this.replaceRendererKeyEl();
    mount(containerElement, this.rendererKeyEl);
  }

  private setupRendererBtn(renderer: Renderer): HTMLElement {
    const input = el('input', { name: 'layer', type: 'radio', checked: this.renderer === renderer });
    const container = el(
      'div',
      { style: { backgroundColor: 'rgba(255, 255, 255, 0.5)', userSelect: 'none', border: 'thin solid darkGray', textAlign: 'right' } },
      el('label', { style: { cursor: 'pointer', padding: '0.3em' }, title: renderer.title }, renderer.name, input)
    );
    input.onchange = () => { this.setRenderer(renderer); };
    return container
  }

  private setRenderer(renderer: Renderer): void {
    this.renderer = renderer;
    this.replaceRendererKeyEl();
    this.updateForecast();
  }

  private replaceRendererKeyEl(): void {
    setChildren(this.rendererKeyEl, [this.renderer.mapKeyEl()]);
  }

  updateForecast(): void {
    this.renderer.update(this.app.forecastSelect.getHourOffset(), this.app.canvas);
  }

}
