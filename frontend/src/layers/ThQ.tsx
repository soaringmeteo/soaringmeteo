import { ColorScale, Color } from "../ColorScale";
import {colorScaleEl, Layer, ReactiveComponents, summarizerFromLocationDetails} from "./Layer";
import {Accessor, JSX} from "solid-js";
import { ForecastMetadata, Zone } from "../data/ForecastMetadata";
import { showDate } from "../shared";
import type { LocationForecasts, DetailedForecast } from "../data/LocationForecasts";
import {useI18n, usingMessages} from "../i18n";

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

  name: usingMessages(m => m.layerThQ()),

  title: usingMessages(m => m.layerThQLegend()),

  dataPath: 'xc-potential',

  reactiveComponents(props: {
    forecastMetadata: ForecastMetadata,
    zone: Zone,
    hourOffset: number,
    timeZone: string | undefined,
    setHourOffset: (value: number) => void
  }): ReactiveComponents {

    const { m } = useI18n();

    const thqElement = (detailedForecast: DetailedForecast, addGutter: boolean): JSX.Element =>
        <div
            style={{
              display: 'inline-block',
              height: '1.1em',
              width: '1.1em',
              'background-color': colorScale.closest(detailedForecast.xcPotential).css(),
              'border': '1px solid dimgray',
              'margin-left': addGutter ? '1px' : '0',
              'box-sizing': 'border-box',
              'cursor': 'pointer'
            }}
            title={ `${ showDate(detailedForecast.time, { showWeekDay: true, timeZone: props.timeZone }) }: ${ detailedForecast.xcPotential }%` }
            onClick={ () => props.setHourOffset(detailedForecast.hourOffsetSinceFirstTimeStep(props.forecastMetadata.firstTimeStep)) }
        />;

    const nextDaysOverview = (locationForecasts: LocationForecasts): JSX.Element => {
      return locationForecasts.dayForecasts
        .filter(dayForecast => dayForecast.forecasts.length === 3) // HACK Specific to GFS. Keep only full days.
        .map((dayForecasts, i) => thqElement(dayForecasts.forecasts[1] /* HACK Specific to GFS */, i !== 0))
    };

    const dayOverview = (locationForecasts: LocationForecasts): JSX.Element => {
      return locationForecasts
          .dayForecasts[0] // HACK Assume WRF forecast is always for exactly one day
          .forecasts.map((detailedForecast, i) => thqElement(detailedForecast, i !== 0));
    };

    const summarizer = summarizerFromLocationDetails(props, (detailedForecast, locationForecasts) => {
      const maybeOverview: Array<[Accessor<string>, JSX.Element]> =
        props.forecastMetadata.modelPath === 'gfs' ?
          [[() => m().summaryWeekOverview(), <span>{ nextDaysOverview(locationForecasts) }</span>]] :
          [[() => m().summaryDayOverview(), <span>{ dayOverview(locationForecasts) }</span>]];
      return maybeOverview.concat([
        [() => m().summaryThQ(), <span>{detailedForecast.xcPotential}%</span>],
        [() => m().summaryThermalVelocity(), <span>{detailedForecast.thermalVelocity} m/s</span>],
        [() => m().summarySoaringLayerDepth(), <span>{detailedForecast.boundaryLayer.soaringLayerDepth} m</span>],
        [() => m().summaryTotalCloudCover(), <span>{Math.round(detailedForecast.cloudCover * 100)}%</span>],
      ]);
    });

    const mapKey = colorScaleEl(colorScale, value => `${value}% `);

    const help = <p>
      { m().helpLayerThQ() }
    </p>;

    return {
      summarizer,
      mapKey,
      help
    }
  }

};
