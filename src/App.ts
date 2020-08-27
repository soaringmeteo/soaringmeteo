import { el, mount, setStyle } from 'redom';
import { initializeMap } from './Map';
import { CanvasLayer } from './CanvasLayer';
import { modelResolution, LocationForecastsData, ForecastMetadata, LocationForecasts } from './Forecast';
import { ForecastSelect } from './ForecastSelect';
import { ForecastLayer } from './ForecastLayer';

export class App {

  forecastSelect: ForecastSelect
  forecastLayer: ForecastLayer
  canvas: CanvasLayer

  constructor(latestForecast: ForecastMetadata, containerElement: HTMLElement) {
    setStyle(containerElement, { display: 'flex', alignIitems: 'stretch', alignContent: 'stretch' });
    // TODO center and zoom
    // The map *must* be initialized before we call the other constructors
    // It *must* also be mounted before we initialize it
    const mapElement = el('div', { style: { flex: 1 } });
    mount(containerElement, mapElement);
    const [canvas, map] = initializeMap(mapElement, latestForecast);
    this.canvas = canvas;

    this.forecastSelect = new ForecastSelect(this, latestForecast, mapElement);
    this.forecastLayer = new ForecastLayer(this, mapElement);
    this.forecastLayer.updateForecast();

    map.on('click', (e: L.LeafletMouseEvent) => {
      const longitude = Math.floor(((e.latlng.lng * 100) + modelResolution / 2) / modelResolution) * modelResolution;
      const latitude = Math.floor(((e.latlng.lat * 100) + modelResolution / 2) / modelResolution) * modelResolution;

      fetch(`${longitude}-${latitude}.json`)
        .then(response => response.json())
        .then((data: LocationForecastsData) => {
          this.forecastSelect.showMeteogram(new LocationForecasts(data, latestForecast));
        })
        .catch(_ => {
          // FIMXE Report issue
        })
    });
  }

}
