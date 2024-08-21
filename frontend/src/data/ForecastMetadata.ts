import {LocationForecasts, LocationForecastsData} from "./LocationForecasts";
import {toLonLat, fromLonLat} from "ol/proj";
import {containsCoordinate} from "ol/extent";
import {Zone} from "./Model";

type ForecastsMetadataData = {
  zones: Array<Zone>
  forecasts: Array<ForecastMetadataData>
}

type ForecastMetadataData = {
  path: string   // e.g., "2020-04-14T06"
  init: string   // e.g., "2020-04-14T06:00:00Z"
  first?: string // e.g., "2020-04-15T06:00Z"
  latest: number // e.g., 189 (number of hours between the first time step and the last one)
  zones: Array<string>
}

// Version of the forecast data format we consume (see backend/common/src/main/scala/org/soaringmeteo/out/package.scala)
const formatVersion = 7
// Base path to access forecast data
const dataPath = `data/${formatVersion}`
export class ForecastMetadata {
  /** Path of the assets for this run */
  readonly runPath: string
  /** Initialization time of this run */
  readonly init: Date
  /** First date-time covered by the forecast run */
  readonly firstTimeStep: Date
  /** Number of hours between the first time step and the latest time-tep */
  readonly latest: number
  /** Path of the assets for this NWP model */
  readonly modelPath: string
  /** Zones available for this forecast run */
  readonly availableZones: Array<Zone>

  constructor(modelPath: string, data: ForecastMetadataData, modelZones: Array<Zone>) {
    this.runPath = data.path;
    this.init = new Date(data.init);
    this.firstTimeStep = data.first ? new Date(data.first) : this.init;
    this.latest = data.latest;
    this.modelPath = modelPath;
    this.availableZones = modelZones.filter(zone => data.zones.includes(zone.id));
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
      const maybePoint = this.closestPoint(zone, longitude, latitude);
      if (maybePoint !== undefined) {
        const [xIndex, yIndex] = maybePoint;
        const [normalizedLongitude, normalizedLatitude] = this.toLonLat(zone, maybePoint);
        const clusteringFactor = 4; // must be consistent with the backend
        const xCluster = Math.floor(xIndex / clusteringFactor);
        const yCluster = Math.floor(yIndex / clusteringFactor);
        const response = await fetch(`${dataPath}/${this.modelPath}/${this.runPath}/${zone.id}/locations/${xCluster}-${yCluster}.json`);
        const data     = await response.json() as Array<Array<LocationForecastsData>>;
        return new LocationForecasts(data[xIndex % clusteringFactor][yIndex % clusteringFactor], this, normalizedLatitude, normalizedLongitude)
      } else {
        return undefined
      }
    } catch (error) {
      console.debug(`Unable to fetch forecast data at ${latitude},${longitude}: ${error}`);
      return undefined
    }
  }

  /**
   * Return the closest point within the `zone`, if the zone contains the provided coordinates.
   * @return The points coordinates in the zone coordinates
   */
  closestPoint(zone: Zone, longitude: number, latitude: number): [number, number] | undefined {
    const proj = zone.raster.proj;
    const extent = zone.raster.extent;
    const [x, y] = fromLonLat([longitude, latitude], proj);
    if (containsCoordinate(extent, [x, y])) {
      const resolution = zone.raster.resolution;
      const xIndex = Math.round(((x - extent[0]) / resolution) - 0.5);
      const yIndex = Math.round(((extent[3] - y) / resolution) - 0.5);
      return [xIndex, yIndex]
    } else {
      return undefined
    }
  }

  toLonLat(zone: Zone, coordinates: [number, number]): [number, number] {
    const raster = zone.raster;
    const x = (coordinates[0] + 0.5) * raster.resolution + raster.extent[0];
    const y = raster.extent[3] - (coordinates[1] + 0.5) * raster.resolution;
    return toLonLat([x, y], raster.proj) as [number, number];
  }

  /**
   * Fetches the forecast data at the given hour offset.
   * Never completes in case of failure (but logs the error).
   */
  urlOfRasterAtHourOffset(zone: string, variablePath: string, hourOffset: number): string {
    return `${dataPath}/${this.modelPath}/${this.runPath}/${zone}/${variablePath}/${hourOffset}.png`
  }

  urlOfVectorTilesAtHourOffset(zone: string, variablePath: string, hourOffset: number): string {
    return `${dataPath}/${this.modelPath}/${this.runPath}/${zone}/${variablePath}/${hourOffset}/{z}-{x}-{y}.mvt`
  }

  defaultHourOffset(): number {
    const noonOffset = 12; // TODO Support other zones
    // Time (in number of hours since 00:00Z) at which the forecast model was initialized (ie, 0, 6, 12, or 18 for GFS)
    const forecastInitHour = +this.firstTimeStep.getUTCHours();
    // Tomorrow (or today, if forecast model was initialized at midnight), noon period
    return ((forecastInitHour === 0 || this.modelPath === 'wrf') ? 0 : 24) + noonOffset - forecastInitHour
  }

}

export const fetchGfsForecastRuns = async (): Promise<[Array<ForecastMetadata>, Array<Zone>]> =>
  fetchForecastRuns('gfs');

export const fetchWrfForecastRuns = async (): Promise<[Array<ForecastMetadata>, Array<Zone>]> =>
  fetchForecastRuns('wrf');

const fetchForecastRuns = async (modelPath: string): Promise<[Array<ForecastMetadata>, Array<Zone>]> => {
  const response = await fetch(`${dataPath}/${modelPath}/forecast.json`);
  const data = await response.json() as ForecastsMetadataData;
  const forecastsMetadata =
    data.forecasts.map(forecastMetadataData =>
      new ForecastMetadata(modelPath, forecastMetadataData, data.zones)
    );
  return [forecastsMetadata, data.zones]
};

// We show three forecast periods per day: morning, noon, and afternoon
const periodsPerDay = 3;

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

export const wrfForecastOffsets = (wrfRun: ForecastMetadata): Array<[number, Date]> => {
  return Array.from({ length: wrfRun.latest + 1 }).map((_, i) => {
    const date = new Date(wrfRun.firstTimeStep);
    date.setUTCHours(date.getUTCHours() + i);
    return [i, date]
  });
};
