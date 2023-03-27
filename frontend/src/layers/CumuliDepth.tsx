import { ColorScale, Color } from "../ColorScale";
import * as L from 'leaflet';
import { colorScaleEl, Layer, ReactiveComponents } from "./Layer";
import { createResource, JSX } from "solid-js";
import { cumulusDepthVariable } from "../data/OutputVariable";
import { ForecastMetadata } from "../data/ForecastMetadata";

const cumuliDepthColorScale = new ColorScale([
  [50,   new Color(0xff, 0xff, 0xff, 0)],
  [400,  new Color(0xff, 0xff, 0xff, 0.25)],
  [800,  new Color(0xff, 0xff, 0xff, 0.5)],
  [1500, new Color(0xff, 0xff, 0x00, 0.5)],
  [3000, new Color(0xff, 0x00, 0x00, 0.5)]
]);

export const cumuliDepthLayer: Layer = {
  key: 'cumuli-depth',
  name: 'Cumulus Clouds',
  title: 'Cumulus clouds depth',
  reactiveComponents(props: {
    forecastMetadata: ForecastMetadata,
    hourOffset: number
  }): ReactiveComponents {

    const [cumulusDepthGrid] =
      createResource(
        () => ({ forecastMetadata: props.forecastMetadata, hourOffset: props.hourOffset }),
        data => data.forecastMetadata.fetchOutputVariableAtHourOffset(cumulusDepthVariable, data.hourOffset)
      );

    const renderer = () => {
      const grid = cumulusDepthGrid();
      return {
        renderPoint(lat: number, lng: number, averagingFactor: number, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
          grid?.mapViewPoint(lat, lng, averagingFactor, cumuliDepth => {
            const color = cumuliDepthColorScale.closest(cumuliDepth);
            ctx.save();
            ctx.fillStyle = color.css();
            ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
            ctx.restore();
          });
        }      
      };
    };

    const summarizer = () => {
      const grid = cumulusDepthGrid();
      return {
        async summary(lat: number, lng: number): Promise<Array<[string, JSX.Element]> | undefined> {
          return grid?.mapViewPoint(lat, lng, 1, cumuliDepth =>
            [
              ["Cumuli depth", <span>{ cumuliDepth } m</span>]
            ]
          )
        }
      }
    };
    
    const mapKey = colorScaleEl(cumuliDepthColorScale, value => `${value} m `);

    const help = <>
      <p>
        Cumulus clouds are clouds caused by thermal activity. No cumulus clouds
        means no thermals or blue thermals. Deep cumulus clouds means there is
        risk of overdevelopment.
      </p>
      <p>The color scale is shown on the bottom left of the screen.</p>
    </>;

    return {
      renderer,
      summarizer,
      mapKey,
      help
    }  
  }
};
