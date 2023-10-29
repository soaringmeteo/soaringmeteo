---
status: accepted
date: 2023-10-10
---

# Use OpenLayers to Render Map Overlays

## Context and Problem Statement

The current implementation of SoarV2 cannot display the WRF forecasts results as an overlay on the map for several reasons:
- It only supports forecast domains in the Mercator projection (WGS84), but the domain of our WRF forecasts uses the Lambert Conformal Conic projection.
- It is not able to render more than 2,500 points on the screen, whereas for WRF we often want to show more than 10,000 points on the screen.

There are two types of map overlays that we want to render on the screen:
- the wind, rendered with arrows showing its direction and speed,
- the other indicators (XC flying potential, thermal velocity, cloud cover, etc.), rendered as a colored square.

## Decision Drivers

- User experience. Zooming and panning the map should be fluid, including on mobile devices.
- Data consumption. The data interchange format should be as lightweight as possible.
- Simplicity of implementation. The solution should preferably be simple to implement and maintain.

## Considered Options

Regarding the wind:
- vector tiles
- a single GeoJSON document
- Cloud-Optimized GeoTIFF

Regarding the other indicators:
- PNG raster reprojected on the frontend
- PNG raster containing data instead of colors, reprojected on the frontend
- Cloud-Optimized GeoTIFF file reprojected on the frontend
- reprojection on the backend to “Slippy Maps”

## Decision Outcome

Chosen options: vector tiles for the wind, and PNG raster reprojected on the frontend for the other indicators, because the other solutions had poor performance, or were too complex to implement. Both can be implemented with the library OpenLayers on the frontend.

### Consequences

- Good, because fewer work is needed on the backend (no need to render slippy maps)
- Good, because the data interchange format is lightweight
- Bad, because more processing power is needed on the frontend (for the reprojection and the rendering of the wind as vector features)
- Bad, the library OpenLayers is the only one that is currently able to perform raster reprojection on the frontend

## Pros and Cons of the Options

### Vector Tiles

Vector tiles are set of GeoJSON features organized in layers with an increasing resolution.

- Good, because the “tiling” aspect is a convenient way to down-sample the dataset as we zoom out
- Good, because the “vector features” can store both the wind speed and direction in a structured manner
- Bad, because it requires more processing power than rendering bare static images (this is a known issue in OpenLayers, which does not yet takes advantage from WebGL for the rendering of vector tiles).
- Bad, because it requires more work on the backend to generate the tiles

### Single GeoJSON Document

Like vector tiles, but flattened into a single GeoJSON document containing all the points (so, no “tiling”).

* Good, because it requires less work on the backend
* Bad, because it requires a lot more work on the frontend to load and process the 40k points

### Cloud-Optimized GeoTIFF

Cloud-Optimized GeoTIFF (COG) files contain georeferenced gridded data.

- Good, because the frontend can only load the data that is currently visible
- Good, because COG files can include down-sampled versions of the dataset that we can display when the user zooms out
- Good, because the file format is lightweight (when compression is enabled)
- Bad, because it is too complex to correctly generate those files on the backend

### PNG Raster Reprojected on the Frontend

Create a PNG image such that each pixel matches a point of the forecast domain.

- Good, because it requires fewer work on the backend
- Good, because the files are lightweight
- Bad, because it requires more processing power on the frontend
- Bad, because the library OpenLayers is the only one that is able to perform raster reprojection on the frontend

### PNG Raster Containing Data Instead of Colors, Reprojected on the Frontend

Same as previous solution, but the pixels in the PNG file contain “data” instead of “colors”.

- Good, because we lose less information
- Bad, because it requires an extra step on the frontend to compute the color of each pixel for the rendering

### Cloud-Optimized GeoTIFF File Reprojected on the Frontend

- Good, because the frontend can only load the data that is currently visible
- Bad, because it is too complex to correctly generate those files on the backend

### Reprojection on the Backend to “Slippy Maps”

Perform the reprojection on the backend instead of the frontend, and generate static images at various resolutions (“Slippy Maps”).

- Good, because it requires less work on the frontend
- Bad, because it requires a lot more processing power on the backend (especially if we want to support high levels of zoom such as 15)
