import { Averager, averager1D, averager2D } from "./Averager";

export type OutputVariable<A> = {
  path: string
  parse(data: any): A
  averager: Averager<A>
}

const OutputVariable = <A>(
  path: string, 
  parse: ((data: any) => A), 
  averager: Averager<A>
): OutputVariable<A> => ({
  path,
  parse,
  averager
});

// WARN Definitions below must be consistent with `backend/src/main/scala/org/soaringmeteo/gfs/out/OutputVariable.scala`

export type Summary = {
  xcPotential: number,
  thermalVelocity: number,
  soaringLayerDepth: number,
  soaringLayerWind: {
    u: number,
    v: number
  },
  cloudCover: number
};

// Data as sent by backend
type SummaryData = [
  number, // XC flying potential, between 0 and 100
  number, // Thermal velocity, in dm/s
  number, // Soaring layer depth, in m
  number, // Boundary layer wind (u), in km/h
  number, // Boundary layer wind (v), in km/h
  number  // Cloud cover, between 0 and 100
]

export const summaryVariable: OutputVariable<Summary> = OutputVariable(
  'summary',
  (data: SummaryData) => ({
    xcPotential: data[0],
    thermalVelocity: data[1] / 10,
    soaringLayerDepth: data[2],
    soaringLayerWind: {
      u: data[3],
      v: data[4]
    },
    cloudCover: data[5] / 100
  }),
  {
    average(as: Array<Summary>): Summary {
      let xcPotentialTotal = 0;
      let thermalVelocityTotal = 0;
      let soaringLayerDepthTotal = 0;
      let soaringLayerWindUTotal = 0;
      let soaringLayerWindVTotal = 0;
      let cloudCoverTotal = 0;
      as.forEach(data => {
        xcPotentialTotal = xcPotentialTotal + data.xcPotential;
        thermalVelocityTotal = thermalVelocityTotal + data.thermalVelocity;
        soaringLayerDepthTotal = soaringLayerDepthTotal + data.soaringLayerDepth;
        soaringLayerWindUTotal = soaringLayerWindUTotal + data.soaringLayerWind.u;
        soaringLayerWindVTotal = soaringLayerWindVTotal + data.soaringLayerWind.v;
        cloudCoverTotal = cloudCoverTotal + data.cloudCover;
      });
      const n = as.length;
      return {
        xcPotential: xcPotentialTotal / n,
        thermalVelocity: thermalVelocityTotal / n,
        soaringLayerDepth: soaringLayerDepthTotal / n,
        soaringLayerWind: {
          u: soaringLayerWindUTotal / n,
          v: soaringLayerWindVTotal / n
        },
        cloudCover: cloudCoverTotal / n
      }
    }
  }
);

/** m */
export const soaringLayerDepthVariable: OutputVariable<number> = OutputVariable(
  'soaring-layer-depth',
  data => data,
  averager1D
);

/** m/s */
export const thermalVelocityVariable: OutputVariable<number> = OutputVariable(
  'thermal-velocity',
  data => data / 10,
  averager1D
);

/** % */
export const cloudCoverVariable: OutputVariable<number> = OutputVariable(
  'cloud-cover',
  data => data / 100,
  averager1D
);

/** m */
export const cumulusDepthVariable: OutputVariable<number> = OutputVariable(
  "cumulus-depth",
  data => data,
  averager1D
);

/** mm */
export const rainVariable: OutputVariable<number> = OutputVariable(
  "rain",
  data => data,
  averager1D
);

/** km/h */
export const windSurfaceVariable: OutputVariable<[number, number]> = OutputVariable(
  "wind-surface",
  data => data,
  averager1D
);

/** km/h */
export const windBoundaryLayerVariable: OutputVariable<[number, number]> = OutputVariable(
  "wind-boundary-layer",
  data => data,
  averager2D
);

/** km/h */
export const wind300mAglVariable: OutputVariable<[number, number]> = OutputVariable(
  "wind-300m-agl",
  data => data,
  averager2D
);

/** km/h */
export const windSoaringLayerTopVariable: OutputVariable<[number, number]> = OutputVariable(
  "wind-soaring-layer-top",
  data => data,
  averager2D
);
