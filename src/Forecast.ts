// Note: do we really need to access older forecasts?
export type ForecastMetadataData = {
  init: string // e.g., "2020-04-14T06:00:00Z"
  latest: number // e.g., 189
}

export class ForecastMetadata {
  readonly init: Date
  readonly latest: number
  constructor(private readonly data: ForecastMetadataData) {
    this.init = new Date(data.init);
    this.latest = data.latest;
  }
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

export class LocationForecasts {
  readonly elevation: number;
  readonly dayForecasts: Array<DayForecasts>;
  constructor(data: LocationForecastsData, private readonly latestForecast: ForecastMetadata) {
    this.elevation = data.h;
    this.dayForecasts = data.d.map(data => new DayForecasts(data));
  }

  initializationTime(): Date {
    return this.latestForecast.init
  }
}

export class DayForecasts {
  readonly thunderstormRisk: number;
  readonly forecasts: Array<DetailedForecast>;
  constructor(data: DayForecastsData) {
    this.thunderstormRisk = data.th;
    this.forecasts = data.h.map(data => new DetailedForecast(data));
  }
}

export class DetailedForecast {
  readonly time: Date;
  constructor(readonly data: DetailedForecastData) {
    this.time = new Date(data.t);
  }
}

export type LocationForecastsData = {
  h: number // elevation
  d: Array<DayForecastsData>
}

type DayForecastsData = {
  th: number // thunderstorm risk
  h: Array<DetailedForecastData>
}

export type DetailedForecastData = {
  t: string // Forecast time
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
  },
  // Mean sea level pressure 
  mslet: number // hPa
}

type PressureLevel =
  '200' | '300' | '400' | '450' | '500' | '550' | '600' | '650' | '700' | '750' | '800' | '850' | '900' | '950'

export type Forecast = {
  [key: string]: ForecastData
}

export const modelResolution = 25 // Hundredths of degrees
