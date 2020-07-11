import { el, mount, setStyle, setChildren } from 'redom';
import { initializeMap } from './Map';
import { CanvasLayer } from './CanvasLayer';
import { LatestForecast, modelResolution, DetailedForecastData } from './Forecast';
import { ForecastSelect } from './ForecastSelect';
import { ForecastLayer } from './ForecastLayer';
import { meteogram } from './Meteogram';
import { filterDetailedForecast } from './ForecastFilter';

export class App {

  forecastSelect: ForecastSelect
  forecastLayer: ForecastLayer
  canvas: CanvasLayer

  constructor(latestForecast: LatestForecast, containerElement: HTMLElement) {
    setStyle(containerElement, { display: 'flex', alignIitems: 'stretch', alignContent: 'stretch' });
    // TODO center and zoom
    // The map *must* be initialized before we call the other constructors
    // It *must* also be mounted before we initialize it
    const mapElement = el('div', { style: { flex: 1 } }); // TODO Simplify
    mount(containerElement, mapElement);
    const [canvas, map] = initializeMap(mapElement);
    this.canvas = canvas;

    this.forecastSelect = new ForecastSelect(this, latestForecast, mapElement);
    this.forecastLayer = new ForecastLayer(this, mapElement);
    this.forecastLayer.updateForecast();

    map.on('click', (e: L.LeafletMouseEvent) => {
      const longitude = Math.floor(((e.latlng.lng * 100) + modelResolution / 2) / modelResolution) * modelResolution;
      const latitude = Math.floor(((e.latlng.lat * 100) + modelResolution / 2) / modelResolution) * modelResolution;

      fetch(`${longitude}-${latitude}.json`)
        .then(response => response.json())
        .then((forecasts: Array<DetailedForecastData>) => {
          const [keyElement, meteogramElement] =
            meteogram(filterDetailedForecast(latestForecast, forecasts, 9 /* TODO Compute from location */));
          this.forecastSelect.showMeteogram(keyElement, meteogramElement);
        })
        .catch(_ => {
          this.forecastSelect.hideMeteogram();
        })
    });
  }

}
