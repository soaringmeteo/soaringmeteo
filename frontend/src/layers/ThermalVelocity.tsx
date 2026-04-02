import { ColorScale, Color } from "../ColorScale";
import {type ForecastMetadata} from '../data/ForecastMetadata';
import {colorScaleEl, Layer, ReactiveComponents, summarizerFromLocationDetails} from './Layer';
import {useI18n, usingMessages} from "../i18n";
import {type Zone} from "../data/Model";

export const defaultThermalVelocityColorScale = new ColorScale([
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

export const daltonianThermalVelocityColorScale = new ColorScale([
  [0.25, new Color(0x33, 0x33, 0x33, 1)],
  [0.50, new Color(0x7a, 0x1f, 0xa2, 1)],
  [0.75, new Color(0xd7, 0x30, 0x27, 1)],
  [1.00, new Color(0xf4, 0x6d, 0x43, 1)],
  [1.25, new Color(0xfd, 0xae, 0x61, 1)],
  [1.50, new Color(0xff, 0xff, 0xbf, 1)],
  [1.75, new Color(0xa6, 0xd9, 0x6a, 1)],
  [2.00, new Color(0x66, 0xc2, 0xa5, 1)],
  [2.50, new Color(0x32, 0x88, 0xbd, 1)],
  [3.00, new Color(0xff, 0xff, 0xff, 1)]
]);

export const thermalVelocityColorScale = (daltonianThqEnabled: boolean): ColorScale =>
  daltonianThqEnabled ? daltonianThermalVelocityColorScale : defaultThermalVelocityColorScale;

export const thermalVelocityLayer: Layer = {
  key: 'thermal-velocity',
  name: usingMessages(m => m.layerThermalVelocity()),
  title: usingMessages(m => m.layerThermalVelocityLegend()),
  dataPath: 'thermal-velocity',
  reactiveComponents(props: {
    forecastMetadata: ForecastMetadata,
    zone: Zone,
    hourOffset: number,
    daltonianThqEnabled: boolean
  }): ReactiveComponents {

    const { m } = useI18n();
    const activeColorScale = thermalVelocityColorScale(props.daltonianThqEnabled);

    const summarizer = summarizerFromLocationDetails(props, detailedForecast => [
      [() => m().summaryThermalVelocity(), <span>{ detailedForecast.thermalVelocity } m/s</span>]
    ]);

    return {
      summarizer,
      mapKey: colorScaleEl(activeColorScale, value => `${value} m/s `),
      help: <p>
        { m().helpLayerThermalVelocity() }
      </p>
    }
  }
};
