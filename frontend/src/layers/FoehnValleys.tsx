import { ColorScale, Color } from "../ColorScale";
import { colorScaleEl, Layer, ReactiveComponents, summarizerFromLocationDetails } from "./Layer";
import { ForecastMetadata } from "../data/ForecastMetadata";
import { useI18n, usingMessages } from "../i18n";
import { Zone } from "../data/Model";

// Colors must stay in sync with the backend `Raster.wrfRasters`
const foehnValleyColorScale = new ColorScale([
  [20,  new Color(0xed, 0xf8, 0xfb, 1)],
  [35,  new Color(0xb2, 0xe2, 0xe2, 1)],
  [50,  new Color(0x66, 0xc2, 0xa4, 1)],
  [65,  new Color(0x2c, 0xa2, 0x5f, 1)],
  [80,  new Color(0x00, 0x6d, 0x2c, 1)],
  [100, new Color(0x00, 0x44, 0x1b, 1)]
]);

const percentage = (value: number | undefined): string =>
  value === undefined ? '–' : `${Math.round(100 * value)} %`;

export const foehnValleySimilarityLayer: Layer = {
  key: 'foehn-valley-similarity',
  name: usingMessages(m => m.layerFoehnValleySimilarity()),
  title: usingMessages(m => m.layerFoehnValleySimilarityLegend()),
  dataPath: 'foehn-valley-similarity',
  reactiveComponents(props: {
    forecastMetadata: ForecastMetadata,
    zone: Zone,
    hourOffset: number
  }): ReactiveComponents {

    const { m } = useI18n();

    const summarizer = summarizerFromLocationDetails(props, detailedForecast => {
      const valley = detailedForecast.valleyFoehn;
      if (valley === undefined) {
        return [[() => m().layerFoehnValleySimilarity(), <span>{ m().foehnValleyNoNearbyLine() }</span>]];
      }
      const direction =
        valley.direction === 'south' ? m().foehnDirectionSouth() :
        valley.direction === 'north' ? m().foehnDirectionNorth() :
        '–';
      const nearest =
        valley.valleyId === undefined ? '–' : `${valley.valleyId} (${(valley.distance / 1000).toFixed(1)} km)`;
      return [
        [() => m().foehnValleyMatch(), <b>{ percentage(valley.index) }</b>],
        [() => m().foehnValleyRawSimilarity(), <span>{ percentage(valley.similarity) }</span>],
        [() => m().foehnValleyDirection(), <span>{ direction }</span>],
        [() => m().foehnValleyNearest(), <span>{ nearest }</span>]
      ];
    });

    const mapKey = colorScaleEl(foehnValleyColorScale, value => `${value} %`);

    const help = <>
      <p>{ m().helpLayerFoehnValleySimilarity() }</p>
      <p>{ m().layerFoehnValleySimilarityLegend() }</p>
    </>;

    return {
      summarizer,
      mapKey,
      help
    }
  }
};
