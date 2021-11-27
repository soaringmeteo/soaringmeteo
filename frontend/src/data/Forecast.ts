import { ForecastMetadata } from "./ForecastMetadata";

export type ForecastPoint = {
  boundaryLayerHeight: number
  uWind: number
  vWind: number
  cloudCover: number,
  rain: number,
  uSurfaceWind: number,
  vSurfaceWind: number,
  u300MWind: number,
  v300MWind: number,
  uBLTopWind: number,
  vBLTopWind: number
}

export class Forecast {
  constructor(readonly data: ForecastData) {}

  /**
   * @param latitude  Must be hundredth of latitude (e.g. 4650 instead of 46.5)
   * @param longitude Must be hundredth of longitude (e.g 725 instead of 7.25)
   */
  at(latitude: number, longitude: number): ForecastPoint | undefined {
    const pointData = this.data[`${longitude / modelResolution},${latitude / modelResolution}`];
    if (pointData !== undefined) {
      return {
        boundaryLayerHeight: pointData[0],
        uWind: pointData[1],
        vWind: pointData[2],
        cloudCover: pointData[3],
        rain: pointData[4],
        uSurfaceWind: pointData[5],
        vSurfaceWind: pointData[6],
        u300MWind: pointData[7],
        v300MWind: pointData[8],
        uBLTopWind: pointData[9],
        vBLTopWind: pointData[10]
      }
    } else {
      return
    }
  }
}

export type ForecastData = {
  [key: string]: ForecastPointData
}

// WARN Must be consistent with `Forecast` JSON encoder in the backend
type ForecastPointData = [
  number, // Boundary layer height
  number, // Wind: u component
  number, // Wind: v component
  number, // Cloud cover
  number, // Total rain
  number, // surface wind u
  number, // surface wind v
  number, // 300m AGL wind u
  number, // 300m AGL wind v
  number, // boundary layer top wind u
  number, // boundary layer top wind v
]

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
  readonly clouds: DetailedClouds;
  readonly boundaryLayer: DetailedBoundaryLayer;
  readonly surface: DetailedSurface;
  readonly rain: DetailedRain;
  readonly meanSeaLevelPressure: number;
  readonly isothermZero: number; // m
  readonly aboveGround: Array<AboveGround>;

  constructor(data: DetailedForecastData, elevation: number) {
    this.time = new Date(data.t);
    this.clouds = {
      highLevel: data.c.h / 100,
      middleLevel: data.c.m / 100,
      lowLevel: data.c.l / 100,
      all: data.c.e / 100
    };
    this.boundaryLayer = {
      height: data.bl.h,
      wind: {
        u: data.bl.u,
        v: data.bl.v
      }
    };
    this.surface = {
      temperature: data.s.t,
      dewPoint: data.s.dt,
      wind: {
        u: data.s.u,
        v: data.s.v
      }
    };
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
            dewPoint: entry.dt
          }
        });
  }

  hourOffsetSinceInitializationTime(initializationTime: Date): number {
    return Math.round((this.time.getTime() - initializationTime.getTime()) / 3600000)
  }

}

export type DetailedClouds = {
  highLevel: number // %
  middleLevel: number // %
  lowLevel: number // %
  all: number // %
};

export type DetailedSurface = {
  temperature: number // °C
  dewPoint: number // °C
  wind: Wind
};

export type DetailedBoundaryLayer = {
  height: number // m
  wind: Wind
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
type AboveGround = {
  u: number // km/h
  v: number // km/h
  elevation: number // m
  temperature: number // °C
  dewPoint: number // °C
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
  // Above ground variables
  p: Array<{
    h: number, // altitude
    t: number, // temperature
    dt: number, // dew point temperature
    // wind
    u: number,
    v: number
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
  mslet: number // hPa
}

export const modelResolution = 25 // Hundredths of degrees

export const normalizeCoordinates =
  (latitude: number, longitude: number): [number, number] => {
    return [
      Math.floor(((latitude * 100) + modelResolution / 2) / modelResolution) * modelResolution,
      Math.floor(((longitude * 100) + modelResolution / 2) / modelResolution) * modelResolution
    ]
  }
