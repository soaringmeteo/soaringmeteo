import { ColorScale, Color } from "../ColorScale";
import {ForecastMetadata} from '../data/ForecastMetadata';
import {colorScaleEl, Layer, ReactiveComponents, summarizerFromLocationDetails} from "./Layer";
import {useI18n, usingMessages} from "../i18n";
import {Zone} from "../data/Model";

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

/**
 * Custom WebGL style for the clouds-rain layer.
 * The backend encodes cloud cover as 0–100 and rain as value + 100.
 * We use a 'case' expression to switch between cloud and rain color ramps.
 */
const cloudsRainWebGLStyle = {
  color: [
    'case',
    ['<', ['band', 1], 0],
    [0, 0, 0, 0], // transparent padding
    // If band value <= 100, use cloud cover color ramp
    ['<', ['band', 1], 20],
    [255, 255, 255, 1],
    ['<', ['band', 1], 40],
    [189, 189, 189, 1.0],
    ['<', ['band', 1], 60],
    [136, 136, 136, 1.0],
    ['<', ['band', 1], 80],
    [77, 77, 77, 1.0],
    ['<', ['band', 1], 100],
    [17, 17, 17, 1.0],
    // Otherwise use rain color ramp (value = rain_mm + 100)
    ['<', ['band', 1], 101],
    [157, 248, 246, 1.0],
    ['<', ['band', 1], 102],
    [0, 0, 255, 1.0],
    ['<', ['band', 1], 104],
    [42, 147, 59, 1.0],
    ['<', ['band', 1], 106],
    [73, 255, 54, 1.0],
    ['<', ['band', 1], 1010],
    [252, 255, 45, 1.0],
    ['<', ['band', 1], 1020],
    [250, 202, 30, 1.0],
    ['<', ['band', 1], 1030],
    [248, 124, 0, 1.0],
    ['<', ['band', 1], 1050],
    [247, 12, 0, 1.0],
    ['<', ['band', 1], 1100],
    [172, 0, 219, 1.0],
    [172, 0, 219, 1.0]
  ]
};

export const cloudsRainLayer: Layer = {
  key: 'clouds-rain',
  name: usingMessages(m => m.layerCloudsAndRain()),
  title: usingMessages(m => m.layerCloudsAndRainLegend()),
  dataPath: 'clouds-rain',
  webglStyle: cloudsRainWebGLStyle,
  reactiveComponents(props: {
    zone: Zone,
    forecastMetadata: ForecastMetadata,
    hourOffset: number
  }): ReactiveComponents {

    const { m } = useI18n();

    const summarizer = summarizerFromLocationDetails(props, detailedForecast => [
      [() => m().summaryTotalCloudCover(), <span>{ Math.round(detailedForecast.cloudCover * 100) }%</span>],
      [() => m().summaryRainfall(), <span>{ detailedForecast.rain.total } mm</span>]
    ]);

    const mapKey = <>
      <div style="margin-bottom: 8px">{ colorScaleEl(rainColorScale, value => ` ${value} mm `) }</div>
      { colorScaleEl(cloudCoverColorScale, value => ` ${value}% `) }
    </>;
    const help = <p>
      { m().helpLayerCloudsAndRain() }
    </p>;

    return {
      summarizer,
      mapKey,
      help
    }
  }
};
