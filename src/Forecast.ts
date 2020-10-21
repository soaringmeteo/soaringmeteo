// Note: do we really need to access older forecasts?
export type ForecastMetadataData = {
  init: string   // e.g., "2020-04-14T06:00:00Z"
  latest: number // e.g., 189
}

export class ForecastMetadata {
  readonly init: Date
  readonly latest: number
  constructor(data: ForecastMetadataData) {
    this.init = new Date(data.init);
    this.latest = data.latest;
  }
}

export type ForecastPoint = {
  boundaryLayerHeight: number
  uWind: number
  vWind: number
  cloudCover: number
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
        cloudCover: pointData[3]
      }
    } else {
      return
    }
  }
}

export type ForecastData = {
  [key: string]: ForecastPointData
}

// WARN Must be consistent with `GfsForecast` JSON encoder in the backend
type ForecastPointData = [
  number, // Boundary layer height
  number, // Wind: u component
  number, // Wind: v component
  number  // Cloud cover
]

export class LocationForecasts {
  readonly elevation: number;
  readonly dayForecasts: Array<DayForecasts>;
  constructor(data: LocationForecastsData, private readonly latestForecast: ForecastMetadata) {
    this.elevation = data.h;
    this.dayForecasts = data.d.map(data => new DayForecasts(data, this.elevation));
  }

  initializationTime(): Date {
    return this.latestForecast.init
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
  readonly topWind: TopWind;

  constructor(data: DetailedForecastData, elevation: number) {
    this.time = new Date(data.t);
    this.clouds = {
      highLevel: data.c.h / 100,
      middleLevel: data.c.m / 100,
      lowLevel: data.c.l / 100
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

    const boundaryLayerElevation = elevation + this.boundaryLayer.height;
    this.topWind = this.findTopWind(data, boundaryLayerElevation, 0, pressureLevels.length - 1);
  }

  /**
   * Finds the wind value in the air layer just above the top of the boundary layer.
   * 
   * @param data                      Forecast data
   * @param boundaryLayerTopElevation Elevation (in meters above sea level) of the boundary layer top
   * @param lowPressureLevelIndex     Lower bound of pressure level index in the `pressureLevels` table
   * @param highPressureLevelIndex    Upper bound of pressure level index in the `pressureLevels` table
   * 
   * The algorithm finds the lowest pressure level that is still above the boundary layer top. It
   * performs a binary search by tuning the `lowPressureLevelIndex` and `highPressureLevelIndex`.
   * 
   * The algorithm terminates when the `lowPressureLevelIndex` is adjacent to the `highPressureLevelIndex`,
   * which means that we can’t reduce further the interval.
   */
  private findTopWind(data: DetailedForecastData, boundaryLayerTopElevation: number, lowPressureLevelIndex: number, highPressureLevelIndex: number): TopWind {
    // Compute the index in the middle of the low and high indices
    const pressureLevelIndex = Math.floor((lowPressureLevelIndex + highPressureLevelIndex) / 2);
    const pressureLevel      = pressureLevels[pressureLevelIndex];
    // If there is no index in between the low and high indices, that’s the end.
    // Let’s return the wind value at the `lowPressureLevelIndex` (remember that the lower the pressure, the higher the elevation)
    if (pressureLevelIndex === lowPressureLevelIndex) {
      const dataAtPressureLevel = data.p[pressureLevel];
      return {
        elevation: dataAtPressureLevel.h,
        u: dataAtPressureLevel.u,
        v: dataAtPressureLevel.v
      }
    } else {
      if (data.p[pressureLevel].h > boundaryLayerTopElevation) {
        // The elevation at `pressureLevel` higher than the boundary layer top,
        // let’s increase the `lowPressureLevelIndex`.
        return this.findTopWind(data, boundaryLayerTopElevation, pressureLevelIndex, highPressureLevelIndex)
      } else {
        // The elevation at `pressureLevel` is lower than the boundary layer top,
        // let’s decrease the `highPressureLevelIndex`.
        return this.findTopWind(data, boundaryLayerTopElevation, lowPressureLevelIndex, pressureLevelIndex)
      }
    }
  }

}

export type DetailedClouds = {
  highLevel: number // %
  middleLevel: number // %
  lowLevel: number // %
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

type TopWind = {
  u: number // km/h
  v: number // km/h
  elevation: number // m
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

type PressureLevel =
  '200' | '300' | '400' | '450' | '500' | '550' | '600' | '650' | '700' | '750' | '800' | '850' | '900' | '950'

const pressureLevels: Array<PressureLevel> =
  ['200', '300', '400',  '450', '500', '550', '600', '650', '700', '750', '800', '850', '900', '950'];

export const modelResolution = 25 // Hundredths of degrees
