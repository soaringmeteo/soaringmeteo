import { ColorScale, Color } from "../ColorScale";
import {colorScaleEl, Layer, ReactiveComponents, summarizerFromLocationDetails} from './Layer';
import {ForecastMetadata, Zone} from '../data/ForecastMetadata';

export const soaringLayerDepthLayer: Layer = {

  key: 'soaring-layer-depth',

  name: 'Soaring Layer Depth',

  title: 'Soaring layer depth',

  dataPath: 'soaring-layer-depth',

  reactiveComponents(props: {
    forecastMetadata: ForecastMetadata,
    zone: Zone,
    hourOffset: number
  }): ReactiveComponents {

    const summarizer = summarizerFromLocationDetails(props, detailedForecast => [
      ["Soaring layer depth", <span>{ detailedForecast.boundaryLayer.soaringLayerDepth } m</span>]
    ]);

    const mapKey = colorScaleEl(soaringLayerDepthColorScale, value => `${value} m `);

    const help = <>
      <p>
        The soaring layer is the area of the atmosphere where we can expect to find thermals and
        soar. The depth of the soaring layer tells us how high we can soar. For instance, a value
        of 850 m means that we can soar up to 850 m above the ground level. Values higher than
        750 m are preferable to fly cross-country.
      </p>
      <p>
        In case of “blue thermals”, the soaring layer is
        the <a href="https://wikipedia.org/wiki/Planetary_boundary_layer" target="_blank">planetary
        boundary layer</a>, otherwise (if there are cumulus clouds) it stops at the cloud base.
      </p>
      <p>
        The color scale is shown on the bottom right of the screen.
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
