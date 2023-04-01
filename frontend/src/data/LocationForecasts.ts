import { ForecastMetadata } from "./ForecastMetadata";

/**
 * Forecast data for several days at a specific location.
 */
export class LocationForecasts {
  readonly elevation: number;
  readonly dayForecasts: Array<DayForecasts>;
  constructor(data: LocationForecastsData, private readonly metadata: ForecastMetadata, readonly latitude: number, readonly longitude: number) {
    this.elevation = data.h;
    this.dayForecasts = data.d.map(data => new DayForecasts(data, this.elevation));
  }

  initializationTime(): Date {
    return this.metadata.init
  }

  /** Offset (number of hours since initialization time) and date of each forecast */
  offsetAndDates(): Array<[number, Date]> {
    return this.dayForecasts
      .map(_ => _.forecasts)
      .reduce((x, y) => x.concat(y), [])
      .map(forecast => {
        return [forecast.hourOffsetSinceInitializationTime(this.metadata.init), forecast.time]
      });
  }

  /** @returns the forecast data at the given hour offset */
  atHourOffset(hourOffset: number): DetailedForecast | undefined {
    return this.dayForecasts.map(_ => _.forecasts)
      .reduce((x, y) => x.concat(y), [])
      .find(forecast => forecast.hourOffsetSinceInitializationTime(this.metadata.init) === hourOffset)
  }

}

export class DayForecasts {
  readonly thunderstormRisk: number;
  readonly forecasts: Array<DetailedForecast>;
  constructor(data: DayForecastsData, elevation: number) {
    this.thunderstormRisk = data.th;
    this.forecasts = data.h.map(data => new DetailedForecast(data, elevation));
  }
}

export class DetailedForecast {
  readonly time: Date;
  readonly xcPotential: number; // between 0 and 100
  readonly thermalVelocity: number; // m/s
  readonly boundaryLayer: DetailedBoundaryLayer;
  readonly surface: DetailedSurface;
  readonly cloudCover: number; // %
  readonly rain: DetailedRain;
  readonly meanSeaLevelPressure: number;
  readonly isothermZero: number; // m
  readonly aboveGround: Array<AboveGround>; // Sorted by ascending elevation

  constructor(data: DetailedForecastData, elevation: number) {
    this.time = new Date(data.t);
    this.xcPotential = data.xc;
    this.thermalVelocity = data.v / 10;
    this.boundaryLayer = {
      depth: data.bl.h,
      soaringLayerDepth: data.bl.c !== undefined ? data.bl.c[0] : data.bl.h,
      wind: {
        u: data.bl.u,
        v: data.bl.v
      },
      cumulusClouds: data.bl.c === undefined ? undefined : ({ bottom: data.bl.c[0] , top: data.bl.c[1] })
    };
    this.surface = {
      temperature: data.s.t,
      dewPoint: data.s.dt,
      wind: {
        u: data.s.u,
        v: data.s.v
      }
    };
    this.cloudCover = data.c / 100;
    this.rain = {
      convective: data.r.c,
      total: data.r.t
    };
    this.meanSeaLevelPressure = data.mslet;
    this.isothermZero = data.iso;

    this.aboveGround =
      data.p
        .filter(e => e.h > elevation)
        .map(entry => {
          return {
            elevation: entry.h,
            u: entry.u,
            v: entry.v,
            temperature: entry.t,
            dewPoint: entry.dt,
            cloudCover: entry.c / 100
          }
        });
  }

  hourOffsetSinceInitializationTime(initializationTime: Date): number {
    return Math.round((this.time.getTime() - initializationTime.getTime()) / 3600000)
  }

}

export type DetailedSurface = {
  temperature: number // °C
  dewPoint: number // °C
  wind: Wind
};

export type DetailedBoundaryLayer = {
  depth: number // m (AGL)
  wind: Wind
  soaringLayerDepth: number // m (AGL)
  cumulusClouds?: {
    bottom: number // m (AGL)
    top: number // m (AGL)
  }
};

export type DetailedRain = {
  convective: number // mm
  total: number // mm
};

type Wind = {
  u: number // km/h
  v: number // km/h
};

/** Various information at some elevation value */
export type AboveGround = {
  u: number // km/h
  v: number // km/h
  elevation: number // m
  temperature: number // °C
  dewPoint: number // °C
  cloudCover: number // %
};

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
  xc: number // XC Potential, between 0 and 100
  // Boundary layer
  bl: {
    // Depth (m AGL)
    h: number,
    // Wind
    u: number,
    v: number,
    // Cumulus clouds bottom and top (m AGL)
    c?: [number, number]
  }
  v: number, // Thermal velocity
  // Above ground variables
  p: Array<{
    h: number, // altitude
    t: number, // temperature
    dt: number, // dew point temperature
    // wind
    u: number,
    v: number,
    c: number // cloud cover
  }>,
  // Surface
  s: {
    t: number, // temperature
    dt: number, // dew point temperature
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
  mslet: number, // hPa
  c: number // Between 0 and 100
}

export const modelResolution = 25 // Hundredths of degrees

/**
 * Return the closest point of the underlying model grid, in hundreths of degrees.
 * 
 * E.g., for GFS `normalizeCoordinates(46.1234, 7.5678) == [4600, 750]`.
 */
export const normalizeCoordinates =
  (latitude: number, longitude: number): [number, number] => {
    return [
      Math.floor(((latitude * 100) + modelResolution / 2) / modelResolution) * modelResolution,
      Math.floor(((longitude * 100) + modelResolution / 2) / modelResolution) * modelResolution
    ]
  }
