import { ColorScale, Color } from "../ColorScale";
import * as L from 'leaflet';
import { colorScaleEl, Layer, ReactiveComponents } from "./Layer";
import { createResource, JSX } from "solid-js";
import { xcFlyingPotentialVariable } from "../data/OutputVariable";
import { ForecastMetadata } from "../data/ForecastMetadata";
import { showDate, xcFlyingPotentialLayerName } from "../shared";
import { LocationForecasts } from "../data/LocationForecasts";

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

    const nextDaysOverview = (locationForecasts: LocationForecasts): JSX.Element => {
      return locationForecasts.dayForecasts
        .filter(dayForecast => dayForecast.forecasts.length === 3) // HACK Specific to GFS. Keep only full days.
        .map((dayForecasts, i) => {
          const medianForecast = dayForecasts.forecasts[1]; // HACK Specific to GFS.
          return <div
            style={{
              display: 'inline-block',
              height: '1.1em',
              width: '1.1em',
              'background-color': colorScale.closest(medianForecast.xcPotential).css(),
              'border-right': '1px solid dimgray',
              'border-top': '1px solid dimgray',
              'border-bottom': '1px solid dimgray',
              'border-left': i === 0 ? '1px solid dimgray' : 'none',
              'box-sizing': 'border-box'
            }}
            title={ `${ showDate(medianForecast.time, { showWeekDay: true }) }: ${ medianForecast.xcPotential }%` }
          />
        })
    };

    const summarizer = () => {
      const grid = xcFlyingPotentialGrid();
      return {
        async summary(latitude: number, longitude: number): Promise<Array<[string, JSX.Element]> | undefined> {
          const locationForecasts = await props.forecastMetadata.fetchLocationForecasts(latitude / 100, longitude / 100);
          const detailedForecast  = locationForecasts?.atHourOffset(props.hourOffset)

          return grid?.mapViewPoint(latitude, longitude, 1, xcPotential => {
            const xcPotentialEntry: [string, JSX.Element] = ["XC Flying Potential", <span>{xcPotential}%</span>];
            return detailedForecast !== undefined ?
              [
                ["Week overview", <span>{ nextDaysOverview(locationForecasts as LocationForecasts) }</span>],
                xcPotentialEntry,
                ["Soaring layer depth", <span>{detailedForecast.boundaryLayer.soaringLayerDepth} m</span>],
                ["Thermal velocity", <span>{detailedForecast.thermalVelocity} m/s</span>],
                ["Total cloud cover", <span>{Math.round(detailedForecast.cloudCover * 100)}%</span>],
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
