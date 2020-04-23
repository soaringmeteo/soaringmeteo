import { initializeMap } from './Map';
import { CanvasLayer } from './CanvasLayer';
import { LatestForecast } from './Forecast';
import { ForecastSelect } from './ForecastSelect';
import { ForecastLayer } from './ForecastLayer';

export class App {

  forecastSelect: ForecastSelect
  forecastLayer: ForecastLayer
  canvas: CanvasLayer

  constructor(latestForecast: LatestForecast, containerElement: HTMLElement) {
    // TODO center and zoom
    this.canvas = initializeMap(containerElement);
    this.forecastSelect = new ForecastSelect(this, latestForecast, containerElement);
    this.forecastLayer = new ForecastLayer(this, containerElement);
    this.forecastLayer.updateForecast();
  }

}
