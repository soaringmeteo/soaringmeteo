import './styles/main.css';
import { start } from './App';

import { registerSW } from 'virtual:pwa-register';

// Force immediate page reload because the format of the forecast metadata is incompatible with previous versions
registerSW({ immediate: true });

const containerElement = document.getElementById('app');
if (containerElement !== null) {
  start(containerElement);
} else {
  alert('Unable to initialize the application');
}
