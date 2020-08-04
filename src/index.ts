import 'leaflet/dist/leaflet.css';
import { App } from './App';
import { LatestForecastData, LatestForecast } from './Forecast';

const containerElement = document.getElementById('app');
if (containerElement !== null) {
  fetch('forecast.json')
    .then(response => response.json())
    .then((data: LatestForecastData) => {
      new App(new LatestForecast(data), containerElement);
    })
    .catch(reason => {
      console.error(reason);
      alert('Unable to retrieve forecast data');
    })
} else {
  alert('Unable to initialize the application');
}
