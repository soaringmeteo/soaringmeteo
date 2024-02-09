import { ColorScale, Color } from "../ColorScale";
import {colorScaleEl, Layer, ReactiveComponents, summarizerFromLocationDetails} from './Layer';
import {ForecastMetadata, Zone} from '../data/ForecastMetadata';
import {useI18n, usingMessages} from "../i18n";

export const soaringLayerDepthLayer: Layer = {

  key: 'soaring-layer-depth',

  name: usingMessages(m => m.layerSoaringLayerDepth()),

  title: usingMessages(m => m.layerSoaringLayerDepthLegend()),

  dataPath: 'soaring-layer-depth',

  reactiveComponents(props: {
    forecastMetadata: ForecastMetadata,
    zone: Zone,
    hourOffset: number
  }): ReactiveComponents {

    const { m } = useI18n();

    const summarizer = summarizerFromLocationDetails(props, detailedForecast => [
      [() => m().summarySoaringLayerDepth(), <span>{ detailedForecast.boundaryLayer.soaringLayerDepth } m</span>]
    ]);

    const mapKey = colorScaleEl(soaringLayerDepthColorScale, value => `${value} m `);

    const help = <>
      <p>
        <a href="https://wikipedia.org/wiki/Planetary_boundary_layer" target="_blank">{ m().helpLayerSoaringLayerDepth1() }</a>
        {' '}{ m().helpLayerSoaringLayerDepth2() }
      </p>
      <p>
        { m().helpLayerSoaringLayerDepth3() }
      </p>
      <p>
        { m().helpLayerSoaringLayerDepth4() }
      </p>
    </>;

    return {
      summarizer,
      mapKey,
      help
    }
  }

};

// TODO Consistency with the backend
const soaringLayerDepthColorScale = new ColorScale([
  [250,  new Color(0x33, 0x33, 0x33, 1)],
  [500,  new Color(0x99, 0x00, 0x99, 1)],
  [750,  new Color(0xff, 0x00, 0x00, 1)],
  [1000, new Color(0xff, 0x99, 0x00, 1)],
  [1250, new Color(0xff, 0xcc, 0x00, 1)],
  [1500, new Color(0xff, 0xff, 0x00, 1)],
  [1750, new Color(0x66, 0xff, 0x00, 1)],
  [2000, new Color(0x00, 0xff, 0xff, 1)],
  [2250, new Color(0x99, 0xff, 0xff, 1)],
  [2500, new Color(0xff, 0xff, 0xff, 1)]
]);
