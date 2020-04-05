export type ForecastData = {
  blh: number,
  u: number,
  v: number,
  c?: number
}

export type Forecast = {
  [key: string]: ForecastData
}

// TODO Upgrade to GFS0.25!
export const modelResolution = 50 // Hundreth of degrees
