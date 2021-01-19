import { el, mount, setStyle } from 'redom';
import { initializeMap } from './Map';
import { CanvasLayer } from './CanvasLayer';
import { modelResolution, LocationForecastsData, LocationForecasts } from './Forecast';
import { ForecastSelect } from './ForecastSelect';
import { ForecastLayer } from './ForecastLayer';
import { ForecastMetadata } from './ForecastMetadata';

export class App {

  forecastSelect: ForecastSelect
  forecastLayer: ForecastLayer
  canvas: CanvasLayer
  private readonly map: L.Map
  private readonly mapElement: HTMLElement
  forecastMetadata: ForecastMetadata

  constructor(readonly forecasts: Array<ForecastMetadata>, containerElement: HTMLElement) {
    setStyle(containerElement, { display: 'flex', alignIitems: 'stretch', alignContent: 'stretch' });
    // The map *must* be initialized before we call the other constructors
    // It *must* also be mounted before we initialize it
    this.mapElement = el('div', { style: { flex: 1 } });
    mount(containerElement, this.mapElement);

    const [canvas, map] = initializeMap(this.mapElement);
    this.canvas = canvas;
    this.map = map;

    this.forecastMetadata = forecasts[forecasts.length - 1];
    this.map.attributionControl.setPrefix(`Initialization: ${this.forecastMetadata.init.toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}`);

    this.forecastSelect = new ForecastSelect(this, this.forecastMetadata, this.mapElement);
    this.forecastLayer = new ForecastLayer(this, this.mapElement);
    this.forecastLayer.updateForecast();

    this.selectForecast(this.forecastMetadata);

    map.on('click', (e: L.LeafletMouseEvent) => {
      const longitude = Math.floor(((e.latlng.lng * 100) + modelResolution / 2) / modelResolution) * modelResolution;
      const latitude = Math.floor(((e.latlng.lat * 100) + modelResolution / 2) / modelResolution) * modelResolution;

      fetch(`${this.forecastMetadata.initS}-${longitude}-${latitude}.json`)
        .then(response => response.json())
        .then((data: LocationForecastsData) => {
          this.forecastSelect.showMeteogram(new LocationForecasts(data, this.forecastMetadata));
        })
        .catch(_ => {
          // FIMXE Report issue
        })
    });
  }

  selectForecast(forecastMetadata: ForecastMetadata): void {
    this.forecastMetadata = forecastMetadata;
    this.map.attributionControl.setPrefix(`Initialization: ${forecastMetadata.init.toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}`);
    this.forecastSelect.unmount();
    this.forecastSelect = new ForecastSelect(this, this.forecastMetadata, this.mapElement);
    this.forecastLayer.updateForecast();
  }

}
