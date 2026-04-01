import { ColorScale, Color } from "../ColorScale";
import {colorScaleEl, Layer, ReactiveComponents, summarizerFromLocationDetails} from './Layer';
import {type ForecastMetadata} from '../data/ForecastMetadata';
import {useI18n, usingMessages} from "../i18n";
import {type Zone} from "../data/Model";

export const defaultSoaringLayerDepthColorScale = new ColorScale([
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

export const daltonianSoaringLayerDepthColorScale = new ColorScale([
  [250,  new Color(0x00, 0x22, 0x4d, 1)],
  [500,  new Color(0x17, 0x37, 0x5e, 1)],
  [750,  new Color(0x2c, 0x4b, 0x6e, 1)],
  [1000, new Color(0x42, 0x60, 0x7e, 1)],
  [1250, new Color(0x59, 0x76, 0x8b, 1)],
  [1500, new Color(0x72, 0x8b, 0x93, 1)],
  [1750, new Color(0x8c, 0xa1, 0x90, 1)],
  [2000, new Color(0xac, 0xb6, 0x7f, 1)],
  [2250, new Color(0xd0, 0xcd, 0x64, 1)],
  [2500, new Color(0xfd, 0xea, 0x45, 1)]
]);

export const soaringLayerDepthColorScale = (daltonianThqEnabled: boolean): ColorScale =>
  daltonianThqEnabled ? daltonianSoaringLayerDepthColorScale : defaultSoaringLayerDepthColorScale;

export const soaringLayerDepthLayer: Layer = {

  key: 'soaring-layer-depth',

  name: usingMessages(m => m.layerSoaringLayerDepth()),

  title: usingMessages(m => m.layerSoaringLayerDepthLegend()),

  dataPath: 'soaring-layer-depth',

  reactiveComponents(props: {
    forecastMetadata: ForecastMetadata,
    zone: Zone,
    hourOffset: number,
    daltonianThqEnabled: boolean
  }): ReactiveComponents {

    const { m } = useI18n();
    const activeColorScale = soaringLayerDepthColorScale(props.daltonianThqEnabled);

    const summarizer = summarizerFromLocationDetails(props, detailedForecast => [
      [() => m().summarySoaringLayerDepth(), <span>{ detailedForecast.boundaryLayer.soaringLayerDepth } m</span>]
    ]);

    const mapKey = colorScaleEl(activeColorScale, value => `${value} m `);

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
