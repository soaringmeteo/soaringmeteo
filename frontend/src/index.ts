import 'leaflet/dist/leaflet.css';
import { App } from './App';
import { fetchForecasts } from './data/ForecastMetadata';

const containerElement = document.getElementById('app');
if (containerElement !== null) {
  fetchForecasts()
    .then((forecasts) => {
      App(forecasts, containerElement);
    })
    .catch(reason => {
      console.error(reason);
      alert('Unable to retrieve forecast data');
    })
} else {
  alert('Unable to initialize the application');
}
