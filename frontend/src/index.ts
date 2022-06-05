import 'leaflet/dist/leaflet.css';
import { App } from './App';
import { fetchDefaultForecast } from './data/ForecastMetadata';

const containerElement = document.getElementById('app');
if (containerElement !== null) {
  fetchDefaultForecast()
    .then(([forecastMetadatas, forecastMetadata, morningOffset, hourOffset, forecast]) => {
      App(forecastMetadatas, forecastMetadata, morningOffset, hourOffset, forecast, containerElement);
    })
    .catch(reason => {
      console.error(reason);
      alert('Unable to retrieve forecast data');
    })
} else {
  alert('Unable to initialize the application');
}
