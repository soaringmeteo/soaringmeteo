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
  [0.25, new Color(0x00, 0x22, 0x4d, 1)],
  [0.50, new Color(0x17, 0x37, 0x5e, 1)],
  [0.75, new Color(0x2c, 0x4b, 0x6e, 1)],
  [1.00, new Color(0x42, 0x60, 0x7e, 1)],
  [1.25, new Color(0x59, 0x76, 0x8b, 1)],
  [1.50, new Color(0x72, 0x8b, 0x93, 1)],
  [1.75, new Color(0x8c, 0xa1, 0x90, 1)],
  [2.00, new Color(0xac, 0xb6, 0x7f, 1)],
  [2.50, new Color(0xd0, 0xcd, 0x64, 1)],
  [3.00, new Color(0xfd, 0xea, 0x45, 1)]
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
