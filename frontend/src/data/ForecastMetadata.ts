import {LocationForecasts, LocationForecastsData} from "./LocationForecasts";
import {toLonLat, fromLonLat} from "ol/proj";
import {containsCoordinate} from "ol/extent";

type ForecastMetadataData = {
  path: string   // e.g., "2020-04-14T06"
  init: string   // e.g., "2020-04-14T06:00:00Z"
  first?: string // e.g., "2020-04-15T06:00Z"
  latest: number // e.g., 189 (number of hours between the first time step and the last one)
  zones: Array<Zone>
}

export type Zone = {
  readonly id: string
  readonly raster: {
    extent: [number, number, number, number]
    resolution: number
    proj: string
  }
  readonly vectorTiles: {
    readonly minZoom: number
    readonly zoomLevels: number
    readonly extent: [number, number, number, number]
    readonly tileSize: number
  }
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
  /** Zone covered by this forecast */
  readonly zones: Array<Zone>

  constructor(modelPath: string, data: ForecastMetadataData) {
    this.runPath = data.path;
    this.init = new Date(data.init);
    this.firstTimeStep = data.first ? new Date(data.first) : this.init;
    this.latest = data.latest;
    this.modelPath = modelPath;
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

export const fetchGfsForecastRuns = async (): Promise<Array<ForecastMetadata>> => {
  const response = await fetch(`${dataPath}/gfs/forecast.json`);
  const data = await response.json() as Array<ForecastMetadataData>;
  return data.map(data => new ForecastMetadata('gfs', data));
};

export const fetchWrfForecastRuns = async (): Promise<[Array<ForecastMetadata>, Array<ForecastMetadata>]> => {
  const response = await fetch(`${dataPath}/wrf/forecast.json`);
  const data = await response.json() as Array<ForecastMetadataData>;
  const wrf6Runs: Array<ForecastMetadata> = [];
  const wrf2Runs: Array<ForecastMetadata> = [];
  data.forEach(data => {
    // If the run contains other zones than 'alps-overview', it means it also contains WRF2 data
    if (data.zones.some(zone => zone.id !== 'alps-overview')) {
      // Duplicate the data into a WRF6 run and a WRF2 run
      const wrf6OnlyData = JSON.parse(JSON.stringify(data)) as ForecastMetadataData;
      // Keep only the 'alps-overview' zone in the WRF6 data
      wrf6OnlyData.zones = wrf6OnlyData.zones.filter(zone => zone.id === 'alps-overview');
      // Remove the 'alps-overview' zone from the WRF2 data
      data.zones = data.zones.filter(zone => zone.id !== 'alps-overview');
      wrf2Runs.push(new ForecastMetadata('wrf', data));
      wrf6Runs.push(new ForecastMetadata('wrf', wrf6OnlyData));
    } else {
      // The data covers only the WRF6 zone
      wrf6Runs.push(new ForecastMetadata('wrf', data));
    }
  });
  return [wrf6Runs, wrf2Runs]
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
