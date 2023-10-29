import { ColorScale, Color } from "../ColorScale";
import {ForecastMetadata, Zone} from '../data/ForecastMetadata';
import {colorScaleEl, Layer, ReactiveComponents, summarizerFromLocationDetails} from "./Layer";

const cloudCoverMaxOpacity = 0.35;

// TODO Make sure this is consistent with what the backend does (consider providing the scale from the backend)
export const cloudCoverColorScale = new ColorScale([
  [20,  new Color(0, 0, 0, 0.00 * cloudCoverMaxOpacity)],
  [40,  new Color(0, 0, 0, 0.25 * cloudCoverMaxOpacity)],
  [60,  new Color(0, 0, 0, 0.50 * cloudCoverMaxOpacity)],
  [80,  new Color(0, 0, 0, 0.75 * cloudCoverMaxOpacity)],
  [100, new Color(0, 0, 0, 1.00 * cloudCoverMaxOpacity)]
]);

export const cloudCoverLayer: Layer = {
  key: 'cloud-cover',
  name: 'Cloud Cover',
  title: 'Cloud cover (all altitudes)',
  dataPath: 'cloud-cover',
  reactiveComponents(props: {
    zone: Zone,
    forecastMetadata: ForecastMetadata,
    hourOffset: number
  }): ReactiveComponents {

    const summarizer = summarizerFromLocationDetails(props, detailedForecast => [
      ["Total cloud cover", <span>{ Math.round(detailedForecast.cloudCover * 100) }%</span>]
    ]);

    const mapKey = colorScaleEl(cloudCoverColorScale, value => `${value}% `);
    const help = <p>
      The cloud cover is a value between 0% and 100% that tells us how much of the
      sunlight will be blocked by the clouds. A low value means a blue sky, and a
      high value means a dark sky.
    </p>;

    return {
      summarizer,
      mapKey,
      help
    }
  }
};
