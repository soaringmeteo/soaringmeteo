import { el, mount, setStyle, setChildren } from 'redom';
import { initializeMap } from './Map';
import { CanvasLayer } from './CanvasLayer';
import { LatestForecast, modelResolution, ForecastData, DetailedForecastData } from './Forecast';
import { ForecastSelect } from './ForecastSelect';
import { ForecastLayer } from './ForecastLayer';
import { locationView } from './LocationView';

export class App {

  forecastSelect: ForecastSelect
  forecastLayer: ForecastLayer
  canvas: CanvasLayer

  constructor(latestForecast: LatestForecast, containerElement: HTMLElement) {
    setStyle(containerElement, { display: 'flex', alignIitems: 'stretch', alignContent: 'stretch' });
    // TODO center and zoom
    // The map *must* be initialized before we call the other constructors
    // It *must* also be mounted before we initialize it
    const mapElement = el('div', { style: { flex: 1 } });
    mount(containerElement, mapElement);
    const [canvas, map] = initializeMap(mapElement);
    this.canvas = canvas;

    this.forecastSelect = new ForecastSelect(this, latestForecast, mapElement);
    this.forecastLayer = new ForecastLayer(this, mapElement);
    this.forecastLayer.updateForecast();

    const detailElement = el('div', { style: { flex: 0, maxWidth: '50%' } });
    mount(containerElement, detailElement);

    map.on('click', (e: L.LeafletMouseEvent) => {
      const longitude = Math.floor(((e.latlng.lng * 100) + modelResolution / 2) / modelResolution) * modelResolution;
      const latitude = Math.floor(((e.latlng.lat * 100) + modelResolution / 2) / modelResolution) * modelResolution;

      fetch(`${longitude}-${latitude}.json`)
        .then(response => response.json())
        .then((forecasts: Array<DetailedForecastData>) => {
          // TODO On mobile only
          // setStyle(mapElement, { flex: 0 });
          // TODO Let user resize, and remember preference in a cookie
          setStyle(detailElement, { flex: 1 });
          setChildren(detailElement, [locationView(latestForecast, forecasts, 9 /* TODO Compute from location */)]);
        })
        .catch(_ => {
          setStyle(detailElement, { flex: 0} );
          setChildren(detailElement, []);
        })
    });
  }

}
