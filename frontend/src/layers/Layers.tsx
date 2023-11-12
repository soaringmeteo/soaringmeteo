import { soaringLayerDepthLayer } from "./SoaringLayerDepth";
import { cloudsRainLayer } from "./CloudsRain";
import { thermalVelocityLayer } from "./ThermalVelocity";
import { soaringLayerTopWindLayer, boundaryLayerWindLayer, surfaceWindLayer, _300MAGLWindLayer, _4000MAMSLWindLayer, _3000MAMSLWindLayer, _2000MAMSLWindLayer } from "./Wind";
import { xcFlyingPotentialLayer } from "./ThQ";
import { Layer } from "./Layer";
import { cumuliDepthLayer } from "./CumuliDepth";

const layersByKey: Map<string, Layer> =
  new Map(
    [
      xcFlyingPotentialLayer,
      soaringLayerDepthLayer,
      thermalVelocityLayer,
      cloudsRainLayer,
      cumuliDepthLayer,
      surfaceWindLayer,
      _300MAGLWindLayer,
      _2000MAMSLWindLayer,
      _3000MAMSLWindLayer,
      _4000MAMSLWindLayer,
      boundaryLayerWindLayer,
      soaringLayerTopWindLayer
    ].map(layer => [layer.key, layer])
  );

export const layerByKey = (key: string): Layer | undefined =>
  layersByKey.get(key);
