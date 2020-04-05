import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import { CanvasLayer } from './CanvasLayer';
import { CompositeRenderer } from './CompositeRenderer';
import { Forecast } from './Forecast';
import { ThQ } from './ThQ';

const mapTilerUrl = 'https://api.maptiler.com/maps/topo/{z}/{x}/{y}.png?key=6hEH9bUrAyDHR6nLDUf6';
const smUrl = 'https://tiles.soaringmeteo.org/{z}/{x}/{y}.png';
const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const map = L.map('map', {
  layers: [
    L.tileLayer(mapTilerUrl, {
      tileSize: 512,
      zoomOffset: -1,
      minZoom: 1,
      crossOrigin: true
    })
  ],
  zoomControl: true,
  center: [46.5, 7],
  zoom: 10
});

const canvas = new CanvasLayer;
canvas.addTo(map);

fetch('06/soargfs-96.json')
  .then(response => response.json())
  .then((forecast: Forecast) => {

    const compositeRenderer = new CompositeRenderer(forecast);
    const thqRenderer = new ThQ(forecast);

    canvas.setDataSource(compositeRenderer);

  });
