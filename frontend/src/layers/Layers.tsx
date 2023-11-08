import { soaringLayerDepthLayer } from "./SoaringLayerDepth";
import { cloudCoverLayer } from "./CloudCover";
import { thermalVelocityLayer } from "./ThermalVelocity";
import { soaringLayerTopWindLayer, boundaryLayerWindLayer, surfaceWindLayer, _300MAGLWindLayer, _4000MAMSLWindLayer, _3000MAMSLWindLayer, _2000MAMSLWindLayer } from "./Wind";
import { xcFlyingPotentialLayer } from "./ThQ";
import { rainLayer } from "./Rain";
import { Layer } from "./Layer";
import { cumuliDepthLayer } from "./CumuliDepth";

const layersByKey: Map<string, Layer> =
  new Map(
    [
      xcFlyingPotentialLayer,
      soaringLayerDepthLayer,
      thermalVelocityLayer,
      cloudCoverLayer,
      cumuliDepthLayer,
      rainLayer,
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
