import * as L from 'leaflet';
import { CanvasLayer } from './CanvasLayer';
import { ForecastMetadata } from './Forecast';

const mapTilerUrl = 'https://api.maptiler.com/maps/topo/{z}/{x}/{y}.png?key=6hEH9bUrAyDHR6nLDUf6';
const smUrl = 'https://tiles.soaringmeteo.org/{z}/{x}/{y}.png';
const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export const initializeMap = (element: HTMLElement, forecastMetadata: ForecastMetadata): [CanvasLayer, L.Map] => {
  const map = L.map(element, {
    layers: [
      L.tileLayer(smUrl, {
        tileSize: 256,
        minZoom: 4,
        maxZoom: 14,
        crossOrigin: true
      })
    ],
    zoomControl: false,
    center: [45.5, 9.5],
    zoom: 7
  });
  
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  const canvas = new (CanvasLayer(forecastMetadata));
  canvas.addTo(map);

  return [canvas as CanvasLayer, map]
}
