import { ColorScale, Color } from "../ColorScale";
import {colorScaleEl, Layer, ReactiveComponents, summarizerFromLocationDetails} from "./Layer";
import { JSX } from "solid-js";
import { ForecastMetadata, Zone } from "../data/ForecastMetadata";
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

  dataPath: 'xc-potential',

  reactiveComponents(props: {
    forecastMetadata: ForecastMetadata,
    zone: Zone,
    hourOffset: number,
    timeZone: string | undefined,
    setHourOffset: (value: number) => void
  }): ReactiveComponents {

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
              'border': '1px solid dimgray',
              'margin-left': i === 0 ? '0' : '1px',
              'box-sizing': 'border-box',
              'cursor': 'pointer'
            }}
            title={ `${ showDate(medianForecast.time, { showWeekDay: true, timeZone: props.timeZone }) }: ${ medianForecast.xcPotential }%` }
            onClick={ () => props.setHourOffset(medianForecast.hourOffsetSinceInitializationTime(props.forecastMetadata.init)) }
          />
        })
    };

    const summarizer = summarizerFromLocationDetails(props, (detailedForecast, locationForecasts) => [
      ["Week overview", <span>{ nextDaysOverview(locationForecasts) }</span>],
      ["XC Flying Potential", <span>{detailedForecast.xcPotential}%</span>],
      ["Soaring layer depth", <span>{detailedForecast.boundaryLayer.soaringLayerDepth} m</span>],
      ["Thermal velocity", <span>{detailedForecast.thermalVelocity} m/s</span>],
      ["Total cloud cover", <span>{Math.round(detailedForecast.cloudCover * 100)}%</span>],
    ]);

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
      summarizer,
      mapKey,
      help
    }
  }

};
