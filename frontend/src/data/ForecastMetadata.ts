import {LocationForecasts, LocationForecastsData, normalizeCoordinates} from "./LocationForecasts";
import {Model} from "../State";

type ForecastMetadataData = {
  h: number      // number of days of historic forecast kept (e.g., 4)
  initS: string  // e.g., "2020-04-14T06"
  init: string   // e.g., "2020-04-14T06:00:00Z"
  first?: string // e.g., "2020-04-15T06:00Z"
  latest: number // e.g., 189
  prev?: [string, string]  // e.g., ["2020-04-13T18-forecast.json", "2020-04-13T18:00:00Z"]
  zones: Array<Zone>
}

export type Zone = {
  readonly id: string
  readonly label: string
  readonly raster: {
    extent: [number, number, number, number]
    proj: string
  }
  readonly vectorTiles: {
    minZoom: number
    zoomLevels: number
    extent: [number, number, number, number]
  }
}

// Version of the forecast data format we consume (see backend/src/main/scala/org/soaringmeteo/package.scala)
const formatVersion = 3
// Base path to access forecast data
const dataPath = `data/${formatVersion}`
export class ForecastMetadata {
  readonly initS: string
  readonly init: Date
  readonly firstTimeStep: Date
  readonly latest: number
  readonly modelPath: string
  readonly zones: Array<Zone>

  constructor(model: Model, data: ForecastMetadataData) {
    this.initS = data.initS;
    this.init = new Date(data.init);
    this.firstTimeStep = data.first ? new Date(data.first) : this.init;
    this.latest = data.latest;
    this.modelPath = model;
    this.zones = data.zones;
  }

  /**
   * @returns The `Date` at the given “hour offset”
   */
  dateAtHourOffset(hourOffset: number): Date {
    const date = new Date(this.firstTimeStep);
    date.setUTCHours(this.firstTimeStep.getUTCHours() + hourOffset);
    return date
  }

  /**
   * Fetches the detailed forecast data at the given location.
   * Fails with an error in case of failure.
   */
  async fetchLocationForecasts(zone: Zone, latitude: number, longitude: number): Promise<LocationForecasts | undefined> {
    try {
      const [normalizedLatitude, normalizedLongitude] = normalizeCoordinates(latitude, longitude);
      const normalizedZoneLeftLongitude = Math.round((zone.raster.extent[0] + 0.125) * 100);
      const normalizedZoneTopLatitude = Math.round((zone.raster.extent[3] - 0.125) * 100);
      const clusteringFactor = 4; // must be consistent with the backend
      const x = ((normalizedLongitude - normalizedZoneLeftLongitude) / 25);
      const y = ((normalizedZoneTopLatitude - normalizedLatitude) / 25);
      const response = await fetch(`${dataPath}/${this.modelPath}/${this.initS}/${zone.id}/locations/${Math.floor(x / clusteringFactor)}-${Math.floor(y / clusteringFactor)}.json`);
      const data     = await response.json() as Array<Array<LocationForecastsData>>;
      return new LocationForecasts(data[x % clusteringFactor][y % clusteringFactor], this, normalizedLatitude / 100, normalizedLongitude / 100)
    } catch (error) {
      console.debug(`Unable to fetch forecast data at ${latitude},${longitude}: ${error}`);
      return undefined
    }
  }

  /**
   * Fetches the forecast data at the given hour offset.
   * Never completes in case of failure (but logs the error).
   */
  urlOfRasterAtHourOffset(zone: string, variablePath: string, hourOffset: number): string {
    return `${dataPath}/${this.modelPath}/${this.initS}/${zone}/${variablePath}/${hourOffset}.png`
  }

  urlOfVectorTilesAtHourOffset(zone: string, variablePath: string, hourOffset: number): string {
    return `${dataPath}/${this.modelPath}/${this.initS}/${zone}/${variablePath}/${hourOffset}/{z}-{x}-{y}.json`
  }

  defaultHourOffset(): number {
    const noonOffset = 12; // TODO Support other zones
    // Time (in number of hours since 00:00Z) at which the forecast model was initialized (ie, 0, 6, 12, or 18 for GFS)
    const forecastInitHour = +this.firstTimeStep.getUTCHours();
    // Tomorrow (or today, if forecast model was initialized at midnight), noon period
    return ((forecastInitHour === 0 || this.modelPath === 'wrf') ? 0 : 24) + noonOffset - forecastInitHour
  }

}

export const fetchForecastRuns = async (model: Model): Promise<Array<ForecastMetadata>> => {
  const response       = await fetch(`${dataPath}/${model}/forecast.json`);
  const data           = await response.json() as ForecastMetadataData;
  const latestForecast = new ForecastMetadata(model, data);
  // Compute date of the oldest forecast we want to show
  const oldestForecastInitDate = new Date(data.init);
  oldestForecastInitDate.setDate(oldestForecastInitDate.getDate() - data.h);
  // Fetch the previous forecasts
  const previousForecasts = await fetchPreviousRuns(model, oldestForecastInitDate, data.prev);
  return previousForecasts.concat([latestForecast]);
}

const fetchPreviousRuns = async (model: Model, oldestForecastInitDate: Date, maybePreviousData?: [string, string]): Promise<Array<ForecastMetadata>> => {
  if (maybePreviousData !== undefined && new Date(maybePreviousData[1]) >= oldestForecastInitDate) {
    const response = await fetch(`${dataPath}/${model}/${maybePreviousData[0]}`);
    const data     = await response.json() as ForecastMetadataData;
    const forecast = new ForecastMetadata(model, data);
    return (await fetchPreviousRuns(model, oldestForecastInitDate, data.prev)).concat([forecast]);
  } else {
    return []
  }
}

// We show three forecast periods per day: morning, noon, and afternoon
export const periodsPerDay = 3;

// TODO Return an array containing an array for each day instead of a flat array
export const forecastOffsets = (gfsRunDateTime: Date, firstPeriodOffset: number, forecastMetadata: ForecastMetadata): Array<[number, Date]> => {
  // UTC-offsets of the periods we are interested in a day (e.g., [9, 12, 15] around longitude 0)
  const forecastUTCOffsets = Array.from({ length: periodsPerDay }, (_, i) => firstPeriodOffset + i * 3);
  return Array.from<unknown, [number, number]>({ length: (forecastMetadata.latest / 3) - 1 }, (_, i) => [gfsRunDateTime.getUTCHours() + (i + 1) * 3, (i + 1) * 3])
    .filter(([utcOffset, _]) => forecastUTCOffsets.includes(utcOffset % 24))
    .map(([utcOffset, gfsOffset]) => {
      const date = new Date(gfsRunDateTime);
      date.setUTCHours(utcOffset);
      return [gfsOffset, date]
    })
};
