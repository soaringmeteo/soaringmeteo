import { boundaryLayerDepthLayer } from "./BoundaryLayerDepth";
import { cloudCoverLayer } from "./CloudCover";
import { cumuliDepthLayer } from "./CumuliDepth";
import { Layer } from "./Layer";
import { noLayer } from "./None";
import { rainLayer } from "./Rain";
import { thermalVelocityLayer } from "./ThermalVelocity";
import { xcFlyingPotentialLayer } from "./ThQ";
import { boundaryLayerTopWindLayer, boundaryLayerWindLayer, surfaceWindLayer, _300MAGLWindLayer } from "./Wind";

export const boundaryLayerDepthKey   = 'boundary-layer-depth';
export const cloudCoverKey           = 'cloud-cover';
export const cumuliDepthKey          = 'cumuli-depth';
export const noneKey                 = 'none';
export const rainKey                 = 'rain';
export const thermalVelocityKey      = 'thermal-velocity';
export const xcFlyingPotentialKey    = 'xc-flying-potential';
export const surfaceWindKey          = 'surface-wind';
export const _300MAGLWindKey         = '300m-agl-wind';
export const boundaryLayerWindKey    = 'boundary-layer-wind';
export const boundaryLayerTopWindKey = 'boundary-layer-top-wind';

// Exhaustive mapping from all the keys to their corresponding layer
const layersByKey = new Map([
  [boundaryLayerDepthKey,   boundaryLayerDepthLayer],
  [cloudCoverKey,           cloudCoverLayer],
  [cumuliDepthKey,          cumuliDepthLayer],
  [noneKey,                 noLayer],
  [rainKey,                 rainLayer],
  [thermalVelocityKey,      thermalVelocityLayer],
  [xcFlyingPotentialKey,    xcFlyingPotentialLayer],
  [surfaceWindKey,          surfaceWindLayer],
  [_300MAGLWindKey,         _300MAGLWindLayer],
  [boundaryLayerWindKey,    boundaryLayerWindLayer],
  [boundaryLayerTopWindKey, boundaryLayerTopWindLayer]
])

export const layerByKey = (key: string): Layer | undefined => layersByKey.get(key)
