import * as L from 'leaflet';
import { CanvasLayer } from './CanvasLayer';

const mapTilerUrl = 'https://api.maptiler.com/maps/topo/{z}/{x}/{y}.png?key=6hEH9bUrAyDHR6nLDUf6';
const smUrl = 'https://tiles.soaringmeteo.org/{z}/{x}/{y}.png';
const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const locationAndZoomKey = 'location-and-zoom'

const loadLocationAndZoom = (): [L.LatLngTuple, number] => {
  // First, read from the URL parameters
  const params = new URLSearchParams(window.location.search);
  const [lat, lng, z] = [params.get('lat'), params.get('lng'), params.get('z')];
  if (lat !== null && lng !== null) {
    return [
      [+lat, +lng],
      z === null ? 7 : +z
    ]
  }
  // Second, read from local storage (returning visitor)
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
  const url = new URL(window.location.toString());
  url.searchParams.set('lat', location.lat.toFixed(4));
  url.searchParams.set('lng', location.lng.toFixed(4));
  url.searchParams.set('z', zoom.toString());
  window.history.replaceState(null, '', url);
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
    zoomControl: false, // set up below
    attributionControl: false, // set up in Attribution.tsx
    center: location,
    zoom: zoom
  });

  map.on('moveend', () => {
    saveLocationAndZoom(map.getCenter(), map.getZoom());
  })
  
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.control.scale({ position: 'bottomleft', imperial: false, maxWidth: 100 }).addTo(map);

  const canvas = new CanvasLayer;
  canvas.addTo(map);

  return [canvas as CanvasLayer, map]
}
