import { ColorScale, Color } from "../ColorScale";
import {ForecastMetadata, Zone} from '../data/ForecastMetadata';
import {colorScaleEl, Layer, ReactiveComponents, summarizerFromLocationDetails} from './Layer';

// TODO Consistency with backend
const rainColorScale = new ColorScale([
  [1,  new Color(0, 0, 255, 0)],
  [3,  new Color(0, 0, 255, 0.30)],
  [7,  new Color(0, 0, 255, 0.70)],
  [10, new Color(0, 0, 255, 1.00)],
]);

export const rainLayer: Layer = {
  key: 'rain',
  name: 'Rain',
  title: 'Total rain',
  dataPath: 'rain',
  reactiveComponents(props: {
    forecastMetadata: ForecastMetadata,
    zone: Zone,
    hourOffset: number
  }): ReactiveComponents {

    const summarizer = summarizerFromLocationDetails(props, detailedForecast => [
      ["Rainfall", <span>{ detailedForecast.rain.total } mm</span>]
    ]);

    return {
      summarizer,
      mapKey: colorScaleEl(rainColorScale, value => `${value} mm `),
      help: <p>The color scale is shown on the bottom left of the screen.</p>
    }
  }
};
