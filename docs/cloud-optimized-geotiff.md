# Cloud-Optimized GeoTIFF Support in GeoTrellis

## Summary

GeoTrellis 3.7.1 (the version used by SoaringMeteo, via `geotrellis-raster`) **fully supports** emitting Cloud-Optimized GeoTIFFs (COGs). No additional dependencies are needed beyond what the project already includes.

## Key API

### Building Overviews

`SinglebandGeoTiff` provides methods to generate the overview pyramids required by COGs:

```scala
// Build all overviews at once (decimation factors: 2, 4, 8, …)
val withOverviews: SinglebandGeoTiff =
  geotiff.withOverviews(
    resampleMethod = NearestNeighbor,  // or Bilinear, etc.
    decimations = List(2, 4, 8),       // optional; auto-computed if omitted
    blockSize = 256                    // tile block size
  )

// Or build a single overview
val overview: SinglebandGeoTiff =
  geotiff.buildOverview(
    resampleMethod = NearestNeighbor,
    decimationFactor = 4,
    blockSize = 256
  )
```

### Writing a COG

The `GeoTiff` trait exposes two ways to produce cloud-optimized output:

```scala
// Write to a file path with optimized IFD ordering
geotiff.write(path = "/output/layer.tif", optimizedOrder = true)

// Or get the bytes directly (e.g. to write to a stream / object store)
val bytes: Array[Byte] = geotiff.toCloudOptimizedByteArray
```

When `optimizedOrder = true`, `GeoTiffWriter` uses a dedicated `appendCloudOptimized` code path that writes IFDs in reverse resolution order (smallest overview first), which is the layout required by the COG specification.

### Storage Method and Compression

COGs require tiled storage. GeoTrellis defaults to `Tiled(256, 256)` but this can be set explicitly:

```scala
import geotrellis.raster.io.geotiff._

val options = GeoTiffOptions(
  storageMethod = Tiled(256, 256),       // block size
  compression = DeflateCompression,      // or NoCompression, LZWCompression, etc.
  colorSpace = ColorSpace.RGB            // optional
)

val geotiff = SinglebandGeoTiff(tile, extent, crs, options = options)
```

## End-to-End Example

```scala
import geotrellis.raster._
import geotrellis.raster.io.geotiff._
import geotrellis.raster.resample.NearestNeighbor
import geotrellis.proj4.LatLng

// 1. Create a GeoTiff from a tile + spatial metadata
val tile: Tile = ???           // computed raster data
val extent: Extent = ???       // geographic bounds
val crs = LatLng              // CRS (EPSG:4326)

val options = GeoTiffOptions(
  storageMethod = Tiled(256, 256),
  compression = DeflateCompression
)

val geotiff = SinglebandGeoTiff(tile, extent, crs, options = options)

// 2. Add overview pyramids
val withOverviews = geotiff.withOverviews(NearestNeighbor)

// 3. Write as Cloud-Optimized GeoTIFF
withOverviews.write("/output/layer.tif", optimizedOrder = true)

// Or get bytes for in-memory use
val cogBytes: Array[Byte] = withOverviews.toCloudOptimizedByteArray
```

## Relevant GeoTrellis Source Files

| File | Role |
|------|------|
| `GeoTiff.scala` (trait) | Defines `toCloudOptimizedByteArray` and `write(path, optimizedOrder)` |
| `GeoTiffWriter.scala` | Implements `appendCloudOptimized()` — writes IFDs in COG order |
| `SinglebandGeoTiff.scala` | Provides `withOverviews()` and `buildOverview()` |
| `GeoTiffOptions.scala` | Configuration: `storageMethod`, `compression`, `tiffType` |
| `StorageMethod.scala` | `Tiled(blockCols, blockRows)` and `Striped` |

## Implications for SoaringMeteo

The current backend generates PNG rasters in `Raster.scala` via `toPng` / `writeAllPngFiles`. To switch to COG output:

1. **Backend (`Raster.scala`)**: Replace `tile.renderPng(colorMap).write(path)` with the COG writing pattern above. Embed CRS and extent metadata, add overviews, and write with `optimizedOrder = true`. Change the file extension from `.png` to `.tif`.

2. **Frontend (`Map.ts`, `ForecastMetadata.ts`)**: Replace `ImageLayer` + `ImageStatic` (which loads a PNG) with `WebGLTileLayer` + `GeoTIFF` source from OpenLayers, which can fetch byte ranges from COG files. Update URL patterns from `${hourOffset}.png` to `${hourOffset}.tif`.

3. **Benefits**:
   - CRS-aware rasters (no manual extent/projection wiring in the frontend)
   - Efficient partial reads via HTTP range requests (only fetch visible tiles at current zoom)
   - Multi-resolution via embedded overviews (fast rendering at low zoom levels)
   - Raw data values preserved (enables client-side styling and dynamic legends)

4. **Considerations**:
   - COG files are larger than color-mapped PNGs (they store raw float/int values, not 8-bit RGBA)
   - Color mapping moves from backend to frontend (WebGL style expressions in OpenLayers)
   - Requires the hosting server to support HTTP Range requests (most static file servers and CDNs do)
   - `formatVersion` must be bumped (currently `7`) to signal the format change

