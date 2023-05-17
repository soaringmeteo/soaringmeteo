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

/** Between 0 and 100 */
export const xcFlyingPotentialVariable: OutputVariable<number> = OutputVariable(
  'xc-potential',
  data => data,
  averager1D
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
  averager2D
);

/** km/h */
export const windBoundaryLayerVariable: OutputVariable<[number, number]> = OutputVariable(
  "wind-boundary-layer",
  data => data,
  averager2D
);

/** km/h */
export const windSoaringLayerTopVariable: OutputVariable<[number, number]> = OutputVariable(
  "wind-soaring-layer-top",
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
export const wind2000mAmslVariable: OutputVariable<[number, number]> = OutputVariable(
  "wind-2000m-amsl",
  data => data,
  averager2D
);

/** km/h */
export const wind3000mAmslVariable: OutputVariable<[number, number]> = OutputVariable(
  "wind-3000m-amsl",
  data => data,
  averager2D
);

/** km/h */
export const wind4000mAmslVariable: OutputVariable<[number, number]> = OutputVariable(
  "wind-4000m-amsl",
  data => data,
  averager2D
);
