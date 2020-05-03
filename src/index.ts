import 'leaflet/dist/leaflet.css';
import { App } from './App';
import { LatestForecast } from './Forecast';

const containerElement = document.getElementById('app');
if (containerElement !== null) {
  fetch('forecast.json')
    .then(response => response.json())
    .then((latestForecast: LatestForecast) => {
      new App(latestForecast, containerElement);
    })
    .catch(reason => {
      console.error(reason);
      alert('Unable to retrieve forecast data');
    })
} else {
  alert('Unable to initialize the application');
}
