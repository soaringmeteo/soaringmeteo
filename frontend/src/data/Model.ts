
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

/** Numerical Weather Prediction Model (e.g. GFS, WRF) */
export type Model = {
  name: ModelName
  /** All the possible zones covered by the model */
  zones: Array<Zone>
  /** Number of hours between two forecast time-steps */
  timeStep: number
}

export type ModelName = 'gfs' | 'wrf';
export const gfsName: ModelName = 'gfs';
export const wrfName: ModelName = 'wrf';
