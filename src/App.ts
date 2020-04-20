import { initializeMap } from './Map';
import { CanvasLayer } from './CanvasLayer';
import { Forecast, LatestForecast } from './Forecast';
import { ThQ } from './ThQ';
import { CompositeRenderer } from './CompositeRenderer';
import { ForecastSelect } from './ForecastSelect';

export class App {

  private forecastSelect: ForecastSelect
  private view: AppView

  constructor(latestForecast: LatestForecast, containerElement: HTMLElement) {
    this.view = new AppView(this, containerElement);
    this.forecastSelect = new ForecastSelect(this, latestForecast, containerElement);
    this.updateForecast();
  }

  updateForecast() {
    const forecastUrl =
      `${this.forecastSelect.getHourOffset()}.json`;
    fetch(forecastUrl)
      .then(response => response.json())
      .then((forecast: Forecast) => {
        const compositeRenderer = new CompositeRenderer(forecast);
        const thqRenderer = new ThQ(forecast);
        this.view.canvas.setDataSource(compositeRenderer);
      })
      .catch(error => {
        console.error(error);
        alert('Unable to retrieve forecast data');
      })
  }

}

export class AppView {

  readonly canvas: CanvasLayer

  // TODO Take as parameters the center and zoom
  constructor(readonly app: App, containerElement: HTMLElement) {
    this.canvas = initializeMap(containerElement);
  }

}
