import {Accessor, JSX, on} from "solid-js";
import { Color, ColorScale } from "../ColorScale";
import {ForecastMetadata, Zone} from "../data/ForecastMetadata";
import {DetailedForecast, LocationForecasts} from "../data/LocationForecasts";

type Summarizer = {
  /** Create a summary of the forecast data on the point (shown in popups) */
  summary(lat: number, lng: number): Promise<[LocationForecasts, Array<[string, JSX.Element]> | undefined] | undefined>
}

// Non-static parts of layers
export type ReactiveComponents = {
  /** The current summarizer (shown in popups) of a layer. */
  readonly summarizer: Accessor<Summarizer>
  /** The map key of the layer. */
  readonly mapKey: JSX.Element
  /** The documentation of the layer (shown in the help modal). */
  readonly help: JSX.Element
}

/**
 * A layer shown over the map (boundary layer height, cloud cover, etc.)
 */
 export type Layer = {
  readonly key: string
  readonly name: string
  readonly title: string
  readonly dataPath: string
  reactiveComponents(props: {
    forecastMetadata: ForecastMetadata,
    zone: Zone,
    hourOffset: number,
    windNumericValuesShown: boolean,
    timeZone: string | undefined,
    setHourOffset: (value: number) => void
  }): ReactiveComponents
}

export const colorScaleEl = (colorScale: ColorScale, format: (value: number) => string): JSX.Element => {
  const colorsAndValues: Array<[Color, string]> = colorScale.points.slice().reverse().map(([value, color]) => [color, format(value)]);
  const length = colorsAndValues.reduce((n, [_, s]) => s.length > n ? s.length : n, 0);
  return <div style={{ width: `${length * 2 / 3}em`, 'padding-top': '0.3em' /* because text overflows */, margin: 'auto' }}>
  {
    colorsAndValues.map(([color, value]) =>
      <div style={{ height: '2em', opacity: 0.7, 'background-color': color.css(), position: 'relative' }}>
        <span style={{ position: 'absolute', top: '-.6em', right: '0.5em', 'text-shadow': 'white 1px 1px 2px' }}>{value}</span>
      </div>
    )
  }
  </div>
};

 export const summarizerFromLocationDetails = (props: {
  zone: Zone,
  forecastMetadata: ForecastMetadata,
  hourOffset: number
}, summary: (detailedForecast: DetailedForecast, locationForecasts: LocationForecasts) => Array<[string, JSX.Element]>) => {
  return (): Summarizer => {
    // Make our dependencies explicit because accessing them from the summary method would be outside the tracking scope
    on(
      [
        () => props.forecastMetadata,
        () => props.hourOffset,
        () => props.zone
      ],
      () => {}
    )();
    return {
      async summary(lat: number, lng: number): Promise<[LocationForecasts, Array<[string, JSX.Element]> | undefined] | undefined> {
        const locationForecasts = await props.forecastMetadata.fetchLocationForecasts(props.zone, lat, lng);
        if (locationForecasts === undefined) {
          return undefined
        }
        const detailedForecast = locationForecasts.atHourOffset(props.hourOffset);
        if (detailedForecast === undefined) {
          return [locationForecasts, undefined]
        } else {
          return [locationForecasts, summary(detailedForecast, locationForecasts)]
        }
      }
    }
  }
}
