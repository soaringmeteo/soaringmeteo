import { ColorScale, Color } from "../ColorScale";
import {colorScaleEl, Layer, ReactiveComponents, summarizerFromLocationDetails} from "./Layer";
import {ForecastMetadata, Zone} from "../data/ForecastMetadata";
import {useI18n, usingMessages} from "../i18n";

const cumuliDepthColorScale = new ColorScale([
  [50,   new Color(0xff, 0xff, 0xff, 0.0)],
  [400,  new Color(0xff, 0xff, 0xff, 0.5)],
  [800,  new Color(0xff, 0xff, 0xff, 1.0)],
  [1500, new Color(0xff, 0xff, 0x00, 1.0)],
  [3000, new Color(0xff, 0x00, 0x00, 1.0)]
]);

export const cumuliDepthLayer: Layer = {
  key: 'cumuli-depth',
  name: usingMessages(m => m.layerCumulusDepth()),
  title: usingMessages(m => m.layerCumulusDepthLegend()),
  dataPath: 'cumulus-depth',
  reactiveComponents(props: {
    forecastMetadata: ForecastMetadata,
    zone: Zone,
    hourOffset: number
  }): ReactiveComponents {

    const { m } = useI18n();

    const summarizer = summarizerFromLocationDetails(props, detailedForecast => {
      const cumulusClouds = detailedForecast.boundaryLayer.cumulusClouds
      const depth =
        cumulusClouds !== undefined ?
          cumulusClouds.top - cumulusClouds.bottom :
          0
      return [
        [() => m().summaryCumuliDepth(), <span>{ depth } m</span>]
      ]
    });

    const mapKey = colorScaleEl(cumuliDepthColorScale, value => `${value} m `);

    const help = <>
      <p>
        { m().helpLayerCumuliDepth1() }
      </p>
      <p>{ m().helpLayerCumuliDepth2() }</p>
    </>;

    return {
      summarizer,
      mapKey,
      help
    }  
  }
};
