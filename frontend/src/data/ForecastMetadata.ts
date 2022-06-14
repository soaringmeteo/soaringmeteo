import { Forecast, ForecastData, LocationForecasts, LocationForecastsData, normalizeCoordinates } from "./Forecast";

type ForecastMetadataData = {
  h: number      // number of days of historic forecast kept (e.g., 4)
  initS: string  // e.g., "2020-04-14T06"
  init: string   // e.g., "2020-04-14T06:00:00Z"
  latest: number // e.g., 189
  prev?: [string, string]  // e.g., ["2020-04-13T18-forecast.json", "2020-04-13T18:00:00Z"]
}
export class ForecastMetadata {
  readonly initS: string
  readonly init: Date
  readonly latest: number

  constructor(data: ForecastMetadataData) {
    this.initS = data.initS;
    this.init = new Date(data.init);
    this.latest = data.latest;
  }

  /**
   * @returns The `Date` at the given “hour offset”
   */
  dateAtHourOffset(hourOffset: number): Date {
    const date = new Date(this.init);
    date.setUTCHours(this.init.getUTCHours() + hourOffset);
    return date
  }

  /**
   * Fetches the detailed forecast data at the given location.
   * Fails with an error in case of failure.
   */
  async fetchLocationForecasts(latitude: number, longitude: number): Promise<LocationForecasts> {
    try {
      const [normalizedLatitude, normalizedLongitude] = normalizeCoordinates(latitude, longitude);
      const response = await fetch(`${this.initS}-${normalizedLongitude}-${normalizedLatitude}.json`);
      const data     = await response.json() as LocationForecastsData;
      return new LocationForecasts(data, this, normalizedLatitude / 100, normalizedLongitude / 100)
    } catch (error) {
      throw `Unable to fetch forecast data at ${latitude},${longitude}: ${error}`;
    }
  }

  /**
   * Fetches the forecast data at the given hour offset.
   * Never completes in case of failure (but logs the error).
   */
  async fetchForecastAtHourOffset(hourOffset: number): Promise<Forecast> {
    try {
      const response = await fetch(`${this.initS}+${hourOffset}.json`);
      const data     = await response.json() as ForecastData;
      return new Forecast(data)
    } catch (error) {
      throw `Unable to retrieve forecast data ${hourOffset} hour(s) after the initialization time: ${error}`;
    }
  }

}

/**
 * @returns A tuple with:
 *   - all the available runs,
 *   - the selected run (most recent one),
 *   - the offset that corresponds to noon time (number of hours to add to 00:00 UTC),
 *   - the offset of the default forecast,
 *   - the default forecast.
 */
 export const fetchDefaultForecast = async (): Promise<[Array<ForecastMetadata>, ForecastMetadata, number, number, Forecast]> => {
  // TODO Compute based on user preferred time zone (currently hard-coded for central Europe)
  // Number of hours to add to 00:00Z to be on the morning forecast period (e.g., 9 for Switzerland)
  const runs              = await fetchForecasts();
  const morningOffset     = 9;
  const noonOffset        = morningOffset + 3 /* hours */; // TODO Abstract over underlying NWP model resolution
  const [run, hourOffset] = latestRun(runs, noonOffset)
  const forecast          = await run.fetchForecastAtHourOffset(hourOffset);
  return [runs, run, morningOffset, hourOffset, forecast];
};

const fetchForecasts = async (): Promise<Array<ForecastMetadata>> => {
  const response       = await fetch('forecast.json');
  const data           = await response.json() as ForecastMetadataData;
  const latestForecast = new ForecastMetadata(data);
  // Compute date of the oldest forecast we want to show
  const oldestForecastInitDate = new Date(data.init);
  oldestForecastInitDate.setDate(oldestForecastInitDate.getDate() - data.h);
  // Fetch the previous forecasts
  const previousForecasts = await fetchPreviousRuns(oldestForecastInitDate, data.prev);
  return previousForecasts.concat([latestForecast]);
}

const fetchPreviousRuns = async (oldestForecastInitDate: Date, maybePreviousData?: [string, string]): Promise<Array<ForecastMetadata>> => {
  if (maybePreviousData !== undefined && new Date(maybePreviousData[1]) >= oldestForecastInitDate) {
    const response = await fetch(maybePreviousData[0]);
    const data     = await response.json() as ForecastMetadataData;
    const forecast = new ForecastMetadata(data);
    return (await fetchPreviousRuns(oldestForecastInitDate, data.prev)).concat([forecast]);
  } else {
    return []
  }
}

/**
 * @param forecastMetadatas  All the available forecast runs
 * @param noonOffset Number of hours to add to 00:00Z
 * @returns A pair containing the latest forecast in the array, and the initial
 *          value for the “hour offset” (which models the number of hours to
 *          add to the forecast initialization time to show a particular period)
 */
 const latestRun = (forecastMetadatas: Array<ForecastMetadata>, noonOffset: number): [ForecastMetadata, number] => {
  const forecastMetadata = forecastMetadatas[forecastMetadatas.length - 1];
  // Time (in number of hours since 00:00Z) at which the forecast model was initialized (ie, 0, 6, 12, or 18 for GFS)
  const forecastInitOffset = +forecastMetadata.init.getUTCHours();
  // Tomorrow (or today, if forecast model was initialized at midnight), noon period
  const hourOffset = (forecastInitOffset === 0 ? 0 : 24) + noonOffset - forecastInitOffset;
  return [forecastMetadata, hourOffset]
};

export const showDate = (date: Date, options?: { showWeekDay?: boolean }): string =>
  date.toLocaleString(
    undefined,
    {
      weekday: (options && options.showWeekDay && 'short') || undefined,
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }
  )

// We show three forecast periods per day: morning, noon, and afternoon
export const periodsPerDay = 3;

// TODO Return an array containing an array for each day instead of a flat array
export const forecastOffsets = (gfsRunDateTime: Date, firstPeriodOffset: number, forecastMetadata: ForecastMetadata): Array<[number, Date]> => {
  // UTC-offsets of the periods we are interested in in a day (e.g., [9, 12, 15] around longitude 0)
  const forecastUTCOffsets = Array.from({ length: periodsPerDay }, (_, i) => firstPeriodOffset + i * 3);
  return Array.from<unknown, [number, number]>({ length: (forecastMetadata.latest / 3) - 1 }, (_, i) => [gfsRunDateTime.getUTCHours() + (i + 1) * 3, (i + 1) * 3])
    .filter(([utcOffset, _]) => forecastUTCOffsets.includes(utcOffset % 24))
    .map(([utcOffset, gfsOffset]) => {
      const date = new Date(gfsRunDateTime);
      date.setUTCHours(utcOffset);
      return [gfsOffset, date]
    })
};
