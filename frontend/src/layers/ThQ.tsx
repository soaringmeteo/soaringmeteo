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
            onClick={ () => props.setHourOffset(medianForecast.hourOffsetSinceFirstTimeStep(props.forecastMetadata.firstTimeStep)) }
          />
        })
    };

    // TODO Is it redundant with meteograms?
    // const dayOverview = (locationForecasts: LocationForecasts): JSX.Element => {
    //
    // };

    const summarizer = summarizerFromLocationDetails(props, (detailedForecast, locationForecasts) => {
      const maybeOverview: Array<[string, JSX.Element]> =
        props.forecastMetadata.modelPath === 'gfs' ?
          [["Week overview", <span>{ nextDaysOverview(locationForecasts) }</span>]] :
          [/*["Day overview", <span>{ dayOverview(locationForecasts) }</span>]*/];
      return maybeOverview.concat([
        ["XC Flying Potential", <span>{detailedForecast.xcPotential}%</span>],
        ["Soaring layer depth", <span>{detailedForecast.boundaryLayer.soaringLayerDepth} m</span>],
        ["Thermal velocity", <span>{detailedForecast.thermalVelocity} m/s</span>],
        ["Total cloud cover", <span>{Math.round(detailedForecast.cloudCover * 100)}%</span>],
      ]);
    });

    const mapKey = colorScaleEl(colorScale, value => `${value}% `);

    const help = <>
      <p>
        It indicates the potential for cross-country flying, from 0% (poor thermals,
        or very strong wind) to 100% (strong, high thermals, weak wind). Look for white
        or blue areas (the full color scale is shown on the bottom right of the screen).
        The XC flying potential index takes into account
        the soaring layer depth, the sunshine, and the average wind speed within the
        boundary layer. Deep soaring layer, strong sunshine, and low wind speeds
        increase the value of this indicator.
      </p>
    </>;

    return {
      summarizer,
      mapKey,
      help
    }
  }

};
