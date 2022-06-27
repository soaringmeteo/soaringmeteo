import * as L from 'leaflet';
import { CanvasLayer } from './CanvasLayer';

const mapTilerUrl = 'https://api.maptiler.com/maps/topo/{z}/{x}/{y}.png?key=6hEH9bUrAyDHR6nLDUf6';
const smUrl = 'https://tiles.soaringmeteo.org/{z}/{x}/{y}.png';
const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const locationAndZoomKey = 'location-and-zoom'

const loadLocationAndZoom = (): [L.LatLngTuple, number] => {
  const storedLocationAndZoom = window.localStorage.getItem(locationAndZoomKey);
  if (storedLocationAndZoom == null) {
    return [
      [45.5, 9.5],
      7
    ]
  } else {
    return JSON.parse(storedLocationAndZoom); // TODO versioning
  }
};

const saveLocationAndZoom = (location: L.LatLng, zoom: number) => {
  window.localStorage.setItem(locationAndZoomKey, JSON.stringify([[location.lat, location.lng], zoom]));
};

export const initializeMap = (element: HTMLElement): [CanvasLayer, L.Map] => {
  const [location, zoom] = loadLocationAndZoom();
  const map = L.map(element, {
    layers: [
      L.tileLayer(smUrl, {
        tileSize: 256,
        minZoom: 4,
        maxZoom: 14
      })
    ],
    zoomControl: false,
    center: location,
    zoom: zoom
  });

  map.on('moveend', () => {
    saveLocationAndZoom(map.getCenter(), map.getZoom());
  })
  
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);

  const canvas = new CanvasLayer;
  canvas.addTo(map);

  return [canvas as CanvasLayer, map]
}
