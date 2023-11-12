import { ColorScale, Color } from "../ColorScale";
import {ForecastMetadata, Zone} from '../data/ForecastMetadata';
import {colorScaleEl, Layer, ReactiveComponents, summarizerFromLocationDetails} from "./Layer";

// TODO Make sure this is consistent with what the backend does (consider providing the scale from the backend)
const cloudCoverColorScale = new ColorScale([
  [20,  new Color(255, 255, 255, 1.00)],
  [40,  new Color(189, 189, 189, 1.00)],
  [60,  new Color(136, 136, 136, 1.00)],
  [80,  new Color(77, 77, 77, 1.00)],
  [100, new Color(17, 17, 17, 1.00)],
]);

const rainColorScale = new ColorScale([
  [1,  new Color(157, 248, 246, 1.00)],
  [2,  new Color(0, 0, 255, 1.00)],
  [4,  new Color(42, 147, 59, 1.00)],
  [6,  new Color(73, 255, 54, 1.00)],
  [10, new Color(252, 255, 45, 1.00)],
  [20, new Color(250, 202, 30, 1.00)],
  [30, new Color(248, 124, 0, 1.00)],
  [50, new Color(247, 12, 0, 1.00)],
  [99, new Color(172, 0, 219, 1.00)],
]);

export const cloudsRainLayer: Layer = {
  key: 'clouds-rain',
  name: 'Clouds an Rain',
  title: 'Clouds and rain',
  dataPath: 'clouds-rain',
  reactiveComponents(props: {
    zone: Zone,
    forecastMetadata: ForecastMetadata,
    hourOffset: number
  }): ReactiveComponents {

    const summarizer = summarizerFromLocationDetails(props, detailedForecast => [
      ["Total cloud cover", <span>{ Math.round(detailedForecast.cloudCover * 100) }%</span>],
      ["Rainfall", <span>{ detailedForecast.rain.total } mm</span>]
    ]);

    const mapKey = <>
      <div style="margin-bottom: 8px">{ colorScaleEl(rainColorScale, value => ` ${value} mm `) }</div>
      { colorScaleEl(cloudCoverColorScale, value => ` ${value}% `) }
    </>;
    const help = <p>
      It indicates the cloud cover as well as the amount of precipitation in the time period.
      The cloud cover is displayed with white and gray shadings, and the precipitation in
      millimeters is displayed with colours as indicated in the map legend.
    </p>;

    return {
      summarizer,
      mapKey,
      help
    }
  }
};
