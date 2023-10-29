import { LocationForecasts, LocationForecastsData, normalizeCoordinates } from "./LocationForecasts";

type ForecastMetadataData = {
  h: number      // number of days of historic forecast kept (e.g., 4)
  initS: string  // e.g., "2020-04-14T06"
  init: string   // e.g., "2020-04-14T06:00:00Z"
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
const dataPath = `data/${formatVersion}/gfs`
export class ForecastMetadata {
  readonly initS: string
  readonly init: Date
  readonly latest: number
  readonly model: string
  readonly zones: Array<Zone>

  constructor(data: ForecastMetadataData) {
    this.initS = data.initS;
    this.init = new Date(data.init);
    this.latest = data.latest;
    this.model = 'GFS (NOAA)' // Hardcoded for now
    this.zones = data.zones
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
  async fetchLocationForecasts(zone: Zone, latitude: number, longitude: number): Promise<LocationForecasts | undefined> {
    try {
      const [normalizedLatitude, normalizedLongitude] = normalizeCoordinates(latitude, longitude);
      const normalizedZoneLeftLongitude = Math.round((zone.raster.extent[0] + 0.125) * 100);
      const normalizedZoneTopLatitude = Math.round((zone.raster.extent[3] - 0.125) * 100);
      const clusteringFactor = 4; // must be consistent with the backend
      const x = ((normalizedLongitude - normalizedZoneLeftLongitude) / 25);
      const y = ((normalizedZoneTopLatitude - normalizedLatitude) / 25);
      const response = await fetch(`${dataPath}/${this.initS}/${zone.id}/locations/${Math.floor(x / clusteringFactor)}-${Math.floor(y / clusteringFactor)}.json`);
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
    return `${dataPath}/${this.initS}/${zone}/${variablePath}/${hourOffset}.png`
  }

  urlOfVectorTilesAtHourOffset(zone: string, variablePath: string, hourOffset: number): string {
    return `${dataPath}/${this.initS}/${zone}/${variablePath}/${hourOffset}/{z}-{x}-{y}.json`
  }

}

/**
 * @returns A tuple with:
 *   - all the available runs,
 *   - the selected run (most recent one),
 *   - the offset that corresponds to noon time (number of hours to add to 00:00 UTC),
 *   - the offset of the default forecast
 */
 export const fetchRunsAndComputeInitialHourOffset = async (): Promise<[Array<ForecastMetadata>, ForecastMetadata, number, number]> => {
  // TODO Compute based on user preferred time zone (currently hard-coded for central Europe) or selected zone
  // Number of hours to add to 00:00Z to be on the morning forecast period (e.g., 9 for Switzerland)
  const runs              = await fetchForecastRuns();
  const morningOffset     = 9;
  const noonOffset        = morningOffset + 3 /* hours */; // TODO Abstract over underlying NWP model resolution
  const [run, hourOffset] = latestRun(runs, noonOffset);
  return [runs, run, morningOffset, hourOffset]
};

const fetchForecastRuns = async (): Promise<Array<ForecastMetadata>> => {
  const response       = await fetch(`${dataPath}/forecast.json`);
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
    const response = await fetch(`${dataPath}/${maybePreviousData[0]}`);
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
