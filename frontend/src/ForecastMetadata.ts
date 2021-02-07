import { LocationForecasts, LocationForecastsData, normalizeCoordinates } from "./Forecast";

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

  /** URI of forecast data at the given coordinates */
  async fetchLocationForecasts(latitude: number, longitude: number): Promise<LocationForecasts> {
    try {
      const [normalizedLatitude, normalizedLongitude] = normalizeCoordinates(latitude, longitude);
      const response = await fetch(`${this.initS}-${normalizedLongitude}-${normalizedLatitude}.json`);
      const data     = await response.json() as LocationForecastsData;
      return new LocationForecasts(data, this)
    } catch (err) {
      throw `Unable to fetch forecast data at ${latitude},${longitude}: ${err}`;
    }
  }

}

export const fetchForecasts = async (): Promise<Array<ForecastMetadata>> => {
  const response       = await fetch('forecast.json');
  const data           = await response.json() as ForecastMetadataData;
  const latestForecast = new ForecastMetadata(data);
  // Compute date of the oldest forecast we want to show
  const oldestForecastInitDate = new Date(data.init);
  oldestForecastInitDate.setDate(oldestForecastInitDate.getDate() - data.h);
  // Fetch the previous forecasts
  const previousForecasts = await fetchPreviousForecasts(oldestForecastInitDate, data.prev);
  return previousForecasts.concat([latestForecast]);
}

const fetchPreviousForecasts = async (oldestForecastInitDate: Date, maybePreviousData?: [string, string]): Promise<Array<ForecastMetadata>> => {
  if (maybePreviousData !== undefined && new Date(maybePreviousData[1]) >= oldestForecastInitDate) {
    const response = await fetch(maybePreviousData[0]);
    const data     = await response.json() as ForecastMetadataData;
    const forecast = new ForecastMetadata(data);
    return (await fetchPreviousForecasts(oldestForecastInitDate, data.prev)).concat([forecast]);
  } else {
    return []
  }
}

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
