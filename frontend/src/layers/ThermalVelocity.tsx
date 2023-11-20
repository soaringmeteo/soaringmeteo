import { ColorScale, Color } from "../ColorScale";
import {ForecastMetadata, Zone} from '../data/ForecastMetadata';
import {colorScaleEl, Layer, ReactiveComponents, summarizerFromLocationDetails} from './Layer';

export const thermalVelocityColorScale = new ColorScale([
  [0.25, new Color(0x33, 0x33, 0x33, 1)],
  [0.50, new Color(0x99, 0x00, 0x99, 1)],
  [0.75, new Color(0xff, 0x00, 0x00, 1)],
  [1.00, new Color(0xff, 0x99, 0x00, 1)],
  [1.25, new Color(0xff, 0xcc, 0x00, 1)],
  [1.50, new Color(0xff, 0xff, 0x00, 1)],
  [1.75, new Color(0x66, 0xff, 0x00, 1)],
  [2.00, new Color(0x00, 0xff, 0xff, 1)],
  [2.50, new Color(0x99, 0xff, 0xff, 1)],
  [3.00, new Color(0xff, 0xff, 0xff, 1)]
]);

export const thermalVelocityLayer: Layer = {
  key: 'thermal-velocity',
  name: 'Thermal Velocity',
  title: 'Thermal updraft velocity',
  reactiveComponents(props: {
    forecastMetadata: ForecastMetadata,
    zone: Zone,
    hourOffset: number
  }): ReactiveComponents {

    const summarizer = summarizerFromLocationDetails(props, detailedForecast => [
      ["Thermal velocity", <span>{ detailedForecast.thermalVelocity } m/s</span>]
    ]);

    return {
      dataPath: () => 'thermal-velocity',
      summarizer,
      mapKey: colorScaleEl(thermalVelocityColorScale, value => `${value} m/s `),
      help: <p>
        The thermal updraft velocity is estimated from the depth of the boundary
        layer and the sunshine. The color scale is shown on the bottom right of the
        screen.
      </p>
    }
  }
};
