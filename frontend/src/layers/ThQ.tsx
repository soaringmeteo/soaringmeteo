import { ColorScale, Color } from "../ColorScale";
import * as L from 'leaflet';
import { colorScaleEl, Layer, ReactiveComponents } from "./Layer";
import { createResource } from "solid-js";
import { xcFlyingPotentialVariable } from "../data/OutputVariable";
import { ForecastMetadata } from "../data/ForecastMetadata";
import { xcFlyingPotentialLayerName } from "../shared";

export const colorScale = new ColorScale([
  [10, new Color(0x33, 0x33, 0x33, 1)],
  [20, new Color(0x99, 0x00, 0x99, 1)],
  [30, new Color(0xff, 0x00, 0x00, 1)],
  [40, new Color(0xff, 0x99, 0x00, 1)],
  [50, new Color(0xff, 0xcc, 0x00, 1)],
  [60, new Color(0xff, 0xff, 0x00, 1)],
  [70, new Color(0x66, 0xff, 0x00, 1)],
  [80, new Color(0x00, 0xff, 0xff, 1)],
  [90, new Color(0x99, 0xff, 0xff, 1)],
  [100, new Color(0xff, 0xff, 0xff, 1)]
]);

export const xcFlyingPotentialLayer: Layer = {

  key: 'xc-flying-potential',

  name: xcFlyingPotentialLayerName,

  title: 'XC flying potential',

  reactiveComponents(props: {
    forecastMetadata: ForecastMetadata,
    hourOffset: number
  }): ReactiveComponents {

    const [xcFlyingPotentialGrid] =
      createResource(
        () => ({ forecastMetadata: props.forecastMetadata, hourOffset: props.hourOffset }),
        data => data.forecastMetadata.fetchOutputVariableAtHourOffset(xcFlyingPotentialVariable, data.hourOffset)
      );

    const renderer = () => {
      const grid = xcFlyingPotentialGrid();
      return {
        renderPoint(latitude: number, longitude: number, averagingFactor: number, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
          grid?.mapViewPoint(latitude, longitude, averagingFactor, xcFlyingPotential => {
            const color = colorScale.closest(xcFlyingPotential);
            ctx.save();
            ctx.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.25)`;
            ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
            ctx.restore();
          });
        }
      }
    };

    const summarizer = () => {
      const grid = xcFlyingPotentialGrid();
      return {
        async summary(latitude: number, longitude: number): Promise<Array<[string, string]> | undefined> {
          const locationForecasts = await props.forecastMetadata.fetchLocationForecasts(latitude / 100, longitude / 100);
          const detailedForecast  = locationForecasts?.atHourOffset(props.hourOffset)

          return grid?.mapViewPoint(latitude, longitude, 1, xcPotential => {
            const xcPotentialEntry: [string, string] = ["XC Flying Potential", `${xcPotential}%`];
            return detailedForecast !== undefined ?
              [
                xcPotentialEntry,
                ["Soaring layer depth", `${detailedForecast.boundaryLayer.soaringLayerDepth} m`],
                ["Thermal velocity", `${detailedForecast.thermalVelocity} m/s`],
                ["Total cloud cover", `${Math.round(detailedForecast.cloudCover * 100)}%`]
              ] :
              [xcPotentialEntry]
        });
        }
      }
    };

    const mapKey = colorScaleEl(colorScale, value => `${value}% `);

    const help = <>
      <p>
        The XC flying potential index is a single indicator that takes into account
        the soaring layer depth, the sunshine, and the average wind speed within the
        boundary layer. Deep soaring layer, strong sunshine, and low wind speeds
        increase the value of this indicator.
      </p>
      <p>
        The color scale is shown on the bottom left of the screen. Click to a location
        on the map to get numerical data.
      </p>
    </>;

    return {
      renderer,
      summarizer,
      mapKey,
      help
    }
  }

};
