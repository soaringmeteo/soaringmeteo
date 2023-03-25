import * as L from 'leaflet';
import { createResource, JSX } from 'solid-js';
import { ColorScale, Color } from "../ColorScale";
import { ForecastMetadata } from '../data/ForecastMetadata';
import { rainVariable } from '../data/OutputVariable';
import { colorScaleEl, Layer, ReactiveComponents } from './Layer';

const drawRain = (rain: number, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void => {
  const color = rainColorScale.closest(rain);
  ctx.fillStyle = color.css();
  ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
}

const rainColorScale = new ColorScale([
  [1,  new Color(0, 0, 255, 0)],
  [3,  new Color(0, 0, 255, 0.30)],
  [7,  new Color(0, 0, 255, 0.70)],
  [10, new Color(0, 0, 255, 1.00)],
]);

export const rainLayer: Layer = {
  key: 'rain',
  name: 'Rain',
  title: 'Total rain',
  reactiveComponents(props: {
    forecastMetadata: ForecastMetadata,
    hourOffset: number
  }): ReactiveComponents {

    const [rainGrid] =
      createResource(
        () => ({ forecastMetadata: props.forecastMetadata, hourOffset: props.hourOffset }),
        (props) => props.forecastMetadata.fetchOutputVariableAtHourOffset(rainVariable, props.hourOffset)
      );

      const renderer = () => {
      const grid = rainGrid();
      return {
        renderPoint(lat: number, lng: number, averagingFactor: number, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
          grid?.mapViewPoint(lat, lng, averagingFactor, rain => drawRain(rain, topLeft, bottomRight, ctx));
        }
      
      }
    };

    const summarizer = () => {
      const grid = rainGrid();
      return {
        async summary(lat: number, lng: number): Promise<Array<[string, JSX.Element]> | undefined> {
          return grid?.mapViewPoint(lat, lng, 1, rain =>
            [
              ["Rainfall", <span>{ rain } mm</span>]
            ]
          )
        }
      
      }
    }

    return {
      renderer,
      summarizer,
      mapKey: colorScaleEl(rainColorScale, value => `${value} mm `),
      help: <p>The color scale is shown on the bottom left of the screen.</p>
    }
  }
};
