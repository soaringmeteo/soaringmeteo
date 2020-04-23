import { el, mount } from 'redom';
import { DataSource, CanvasLayer } from "./CanvasLayer";
import * as L from 'leaflet';
import { CompositeRenderer } from './CompositeRenderer';
import { Forecast } from './Forecast';
import { ThQ } from './ThQ';
import { App } from './App';

class Renderer {

  constructor(readonly name: string, private readonly renderer: (forecast: Forecast) => DataSource) {}

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

const mixedRenderer = new Renderer('Mixed', forecast => new CompositeRenderer(forecast));
const thqRenderer   = new Renderer('ThQ', forecast => new ThQ(forecast));

/**
 * Overlay on the map that displays the soaring forecast.
 */
export class ForecastLayer {

  private renderer: Renderer;

  // TODO Take as parameter the pre-selected layer
  constructor(readonly app: App, containerElement: HTMLElement) {
    this.renderer = mixedRenderer;

    const mixedEl = this.setupRenderer(mixedRenderer);
    const thqEl   = this.setupRenderer(thqRenderer);

    const rootElement = el(
      'div',
      {
        style: { position: 'absolute', right: 0, zIndex: 1000, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'end', justifyContent: 'center' }
      },
      thqEl,
      mixedEl
    )
    L.DomEvent.disableClickPropagation(rootElement);
    L.DomEvent.disableScrollPropagation(rootElement);
    mount(containerElement, rootElement);
  }

  setupRenderer(renderer: Renderer): HTMLElement {
    const input = el('input', { name: 'layer', type: 'radio', checked: this.renderer === renderer });
    const container = el(
      'div',
      { style: { backgroundColor: 'rgba(255, 255, 255, 0.5)', userSelect: 'none', border: 'thin solid darkGray' } },
      el('label', { style: { cursor: 'pointer', padding: '0.3em' } }, renderer.name, input)
    );
    input.onchange = () => { this.setRenderer(renderer); };
    return container
  }

  private setRenderer(renderer: Renderer): void {
    this.renderer = renderer;
    this.updateForecast();
  }

  updateForecast() {
    this.renderer.update(this.app.forecastSelect.getHourOffset(), this.app.canvas);
  }

}
