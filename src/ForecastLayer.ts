import { el, mount, setChildren } from 'redom';
import { DataSource, CanvasLayer } from "./CanvasLayer";
import * as L from 'leaflet';
import { Mixed, boundaryDepthColorScale as mixedColorScale } from './layers/Mixed';
import { Forecast } from './Forecast';
import { ThQ, colorScale as thQColorScale } from './layers/ThQ';
import { App } from './App';
import { ColorScale } from './ColorScale';
import { Clouds } from './layers/Clouds';

class Renderer {

  constructor(
    readonly name: string,
    private readonly renderer: (forecast: Forecast) => DataSource,
    readonly mapKeyEl: () => HTMLElement
  ) {}

  update(hourOffset: number, canvas: CanvasLayer) {
    fetch(`${hourOffset}.json`)
      .then(response => response.json())
      .then((forecast: Forecast) => canvas.setDataSource(this.renderer(forecast)))
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

const mixedRenderer = new Renderer(
  'Mixed',
  forecast => new Mixed(forecast),
  // FIXME Maybe implement map key in datasource...
  () => colorScaleEl(mixedColorScale, value => `${value}m `)
);
const thqRenderer = new Renderer(
  'ThQ',
  forecast => new ThQ(forecast),
  () => colorScaleEl(thQColorScale, value => `${Math.round(value * 100)}% `)
);
const cloudsRenderer = new Renderer(
  'Clouds',
  forecast => new Clouds(forecast),
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

    const mixedEl  = this.setupRendererBtn(mixedRenderer);
    const thqEl    = this.setupRendererBtn(thqRenderer);
    const cloudsEl = this.setupRendererBtn(cloudsRenderer);

    const rootElement = el(
      'div',
      {
        style: { position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 1000 }
      },
      thqEl,
      mixedEl,
      cloudsEl
    )
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
      el('label', { style: { cursor: 'pointer', padding: '0.3em' } }, renderer.name, input)
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
