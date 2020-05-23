// Note: do we really need to access older forecasts?
export type LatestForecast = {
  date: string // e.g., "2020-04-14"
  time: string // "00", "06", "12", or "18"
}

export type ForecastData = {
  blh: number,
  // Wind
  u: number,
  v: number,
  // Clouds
  c: {
    e: number,
    l: number,
    m: number,
    h: number
  }
}

export type DetailedForecastData = {
  // Boundary layer
  bl: {
    // Height
    h: number,
    // Wind
    u: number,
    v: number,
  }
  // Clouds
  c: {
    e: number,
    l: number,
    m: number,
    h: number,
    c: number,
    b: number
  },
  // Isobaric variables
  p: {
    [P in PressureLevel]: {
      h: number, // altitude
      t: number, // temperature
      rh: number, // relative humidity
      // wind
      u: number,
      v: number
    }
  },
  // Surface
  s: {
    t: number, // temperature
    rh: number, // relative humidity
    // Wind
    u: number,
    v: number
  }
  // Isotherm 0°C
  iso: number,
  // Rain
  r: {
    t: number, // total
    c: number // convective
  }
}

type PressureLevel =
  '200' | '300' | '400' | '450' | '500' | '550' | '600' | '650' | '700' | '750' | '800' | '850' | '900' | '950'

export type Forecast = {
  [key: string]: ForecastData
}

// TODO Upgrade to GFS0.25!
export const modelResolution = 50 // Hundredths of degrees
