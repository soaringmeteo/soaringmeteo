import 'leaflet/dist/leaflet.css';
import { start } from './App';

const containerElement = document.getElementById('app');
if (containerElement !== null) {
  start(containerElement);
} else {
  alert('Unable to initialize the application');
}
