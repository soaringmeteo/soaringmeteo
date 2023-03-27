import * as L from 'leaflet';
import { createResource, JSX } from 'solid-js';
import { ColorScale, Color } from "../ColorScale";
import { ForecastMetadata } from '../data/ForecastMetadata';
import { thermalVelocityVariable } from '../data/OutputVariable';
import { colorScaleEl, Layer, ReactiveComponents } from './Layer';

export const thermalVelocityColorScale = new ColorScale([
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

export const thermalVelocityLayer: Layer = {
  key: 'thermal-velocity',
  name: 'Thermal Velocity',
  title: 'Thermal updraft velocity',
  reactiveComponents(props: {
    forecastMetadata: ForecastMetadata,
    hourOffset: number
  }): ReactiveComponents {

    const [thermalVelocityGrid] =
      createResource(
        () => ({ forecastMetadata: props.forecastMetadata, hourOffset: props.hourOffset }),
        data => data.forecastMetadata.fetchOutputVariableAtHourOffset(thermalVelocityVariable, data.hourOffset)
      );

    const renderer = () => {
      const grid = thermalVelocityGrid();
      return {
        renderPoint(latitude: number, longitude: number, averagingFactor: number, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
          grid?.mapViewPoint(latitude, longitude, averagingFactor, thermalVelocity => {
            const color = thermalVelocityColorScale.closest(thermalVelocity);
            ctx.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.25)`;
            ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
          });
        }      
      }
    };


    const summarizer = () => {
      const grid = thermalVelocityGrid();
      return {
        async summary(latitude: number, longitude: number): Promise<Array<[string, JSX.Element]> | undefined> {
          return grid?.mapViewPoint(latitude, longitude, 1, thermalVelocity =>
            [
              ["Thermal velocity", <span>{ thermalVelocity } m/s</span>]
            ]
          );
        }      
      }
    };

    return {
      renderer,
      summarizer,
      mapKey: colorScaleEl(thermalVelocityColorScale, value => `${value} m/s `),
      help: <p>
        The thermal updraft velocity is estimated from the depth of the boundary
        layer and the sunshine. The color scale is shown on the bottom left of the
        screen.
      </p>
    }
  }
};
