// Note: do we really need to access older forecasts?
export type LatestForecast = {
  date: string // e.g., "2020-04-14"
  time: string // "00", "06", "12", or "18"
}

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
