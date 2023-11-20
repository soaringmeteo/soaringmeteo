import { ColorScale, Color } from "../ColorScale";
import {colorScaleEl, Layer, ReactiveComponents, summarizerFromLocationDetails} from "./Layer";
import {ForecastMetadata, Zone} from "../data/ForecastMetadata";

const cumuliDepthColorScale = new ColorScale([
  [50,   new Color(0xff, 0xff, 0xff, 0.0)],
  [400,  new Color(0xff, 0xff, 0xff, 0.5)],
  [800,  new Color(0xff, 0xff, 0xff, 1.0)],
  [1500, new Color(0xff, 0xff, 0x00, 1.0)],
  [3000, new Color(0xff, 0x00, 0x00, 1.0)]
]);

export const cumuliDepthLayer: Layer = {
  key: 'cumuli-depth',
  name: 'Cumulus Clouds',
  title: 'Cumulus clouds depth',
  dataPath: 'cumulus-depth',
  reactiveComponents(props: {
    forecastMetadata: ForecastMetadata,
    zone: Zone,
    hourOffset: number
  }): ReactiveComponents {

    const summarizer = summarizerFromLocationDetails(props, detailedForecast => {
      const cumulusClouds = detailedForecast.boundaryLayer.cumulusClouds
      const depth =
        cumulusClouds !== undefined ?
          cumulusClouds.top - cumulusClouds.bottom :
          0
      return [
        ["Cumuli depth", <span>{ depth } m</span>]
      ]
    });

    const mapKey = colorScaleEl(cumuliDepthColorScale, value => `${value} m `);

    const help = <>
      <p>
        Cumulus clouds are clouds caused by thermal activity. No cumulus clouds
        means no thermals or blue thermals. Deep cumulus clouds means there is
        risk of over-development.
      </p>
      <p>The color scale is shown on the bottom right of the screen.</p>
    </>;

    return {
      summarizer,
      mapKey,
      help
    }  
  }
};
