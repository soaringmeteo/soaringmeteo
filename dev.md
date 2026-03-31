# SoaringMeteo 2 Developer Notes

## Overview

This repository contains two distinct parts:

- `backend/`
  Scala programs that ingest weather model outputs, derive soaring-relevant metrics, and publish static assets.
- `frontend/`
  A SolidJS/OpenLayers client that reads those assets and renders the interactive map, diagrams, and settings UI.

The backend does not serve requests dynamically. It is an offline asset-production pipeline. The frontend later consumes the generated files under `data/<formatVersion>/...`.

## High-Level Architecture

The data flow is:

1. Ingest model inputs.
2. Derive a normalized `Forecast` grid for each forecast time step.
3. Export multiple output products from that forecast grid:
   - raster PNG overlays
   - vector tiles for winds
   - JSON forecast clusters for point details, meteograms, and soundings
4. Write `forecast.json` metadata describing available runs and zones.
5. The frontend fetches `forecast.json`, then references the static assets directly.

## Repository Layout

- `backend/common/`
  Shared domain model, derived soaring metrics, raster/vector output logic, JSON output, metadata format.
- `backend/gfs/`
  GFS-specific ingestion and pipeline.
- `backend/wrf/`
  WRF-specific ingestion and pipeline.
- `frontend/src/`
  Map UI, layer definitions, settings, diagrams, and state management.
- `docs/decisions/`
  Architecture decision records.

## Core Domain Model

The central derived object is `Forecast` in `backend/common/src/main/scala/org/soaringmeteo/Forecast.scala`.

Each `Forecast` contains:

- raw or semi-raw weather values such as winds, cloud cover, rain, temperatures
- soaring-specific values such as:
  - `thermalVelocity`
  - `soaringLayerDepth`
  - `xcFlyingPotential`

That means the backend already computes the thermal-quality value itself. The frontend does not compute the metric, only its visual representation.

## Thermal Quality Computation

Thermal quality is represented by `xcFlyingPotential`.

The formula lives in `backend/common/src/main/scala/org/soaringmeteo/XCFlyingPotential.scala`.

It combines:

- thermal velocity
- soaring layer depth
- boundary layer wind

The result is an integer between `0` and `100`.

This is the backend truth for thermal quality. Any accessibility work should preserve this metric and only change how it is encoded visually.

## Derived Thermal Inputs

Two important upstream computations are:

- `Thermals.velocity(...)` in `backend/common/src/main/scala/org/soaringmeteo/Thermals.scala`
- `Thermals.soaringLayerDepth(...)` in the same file

These feed the thermal-quality formula together with the boundary-layer wind.

## Backend Output Types

The backend produces three main output families.

### 1. Raster PNG overlays

Defined in `backend/common/src/main/scala/org/soaringmeteo/out/Raster.scala`.

Each raster output is described by:

- a path such as `xc-potential`
- an extractor from `Forecast`
- a `ColorMap`
- a PNG encoding

Important detail:

The thermal-quality color palette is currently hard-coded in the backend raster definition for `xc-potential`.

The current thresholds are:

- `10 -> 0x333333`
- `20 -> 0x990099`
- `30 -> 0xff0000`
- `40 -> 0xff9900`
- `50 -> 0xffcc00`
- `60 -> 0xffff00`
- `70 -> 0x66ff00`
- `80 -> 0x00ffff`
- `90 -> 0x99ffff`
- `100 -> 0xffffff`

The same legacy palette pattern is also reused for:

- `soaring-layer-depth`
- `thermal-velocity`

So the backend is already one of the places that must change if the map raster itself should become Daltonian-friendly.

### 2. Vector tiles

Defined in `backend/common/src/main/scala/org/soaringmeteo/out/VectorTiles.scala`.

These are used for wind layers on the map.

The backend writes meteorological wind data into vector tiles. The frontend controls how those vectors are styled on screen.

This means wind accessibility is likely split across:

- backend data content
- frontend rendering style

### 3. Location JSON clusters

Defined in `backend/common/src/main/scala/org/soaringmeteo/out/JsonData.scala`.

These files provide detailed forecast values by location and time step. The frontend uses them for:

- summaries
- meteograms
- sounding diagrams

The JSON carries numeric thermal-quality values, not baked colors.

## GFS Pipeline

The GFS pipeline entry point is `backend/gfs/src/main/scala/org/soaringmeteo/gfs/DataPipeline.scala`.

Responsibilities:

- download GRIB files or reuse local GRIBs
- parse GRIBs into `Forecast` grids
- generate raster PNGs and vector tiles
- persist forecast data to the on-disk store

Important design traits:

- GRIB reading is serialized because the GRIB library is not thread-safe
- raster/vector generation is isolated in its own execution context
- final assets are written per time step and per subgrid

## WRF Pipeline

The WRF pipeline entry point is `backend/wrf/src/main/scala/org/soaringmeteo/wrf/DataPipeline.scala`.

Responsibilities:

- read NetCDF outputs from WRF
- generate raster PNGs and vector tiles
- generate clustered location JSON
- write run metadata
- delete old forecast data

Compared with GFS, WRF reads local model outputs instead of downloading GRIBs first.

## Forecast Metadata Contract

The shared output-format version is defined in `backend/common/src/main/scala/org/soaringmeteo/out/package.scala`.

The frontend expects the same `formatVersion` in `frontend/src/data/ForecastMetadata.ts`.

This matters if we introduce any incompatible backend metadata change. If we only add optional metadata fields, we should avoid bumping the format version unless the frontend requires strict changes to parse the payload.

## How The Frontend Consumes Backend Assets

The frontend loads:

- `data/<formatVersion>/<model>/forecast.json`
- raster PNGs like:
  - `data/<formatVersion>/<model>/<run>/<zone>/xc-potential/<hour>.png`
- vector tiles like:
  - `data/<formatVersion>/<model>/<run>/<zone>/wind-boundary-layer/<hour>/{z}-{x}-{y}.mvt`
- clustered JSON detail files under `locations/`

That asset URL construction happens in `frontend/src/data/ForecastMetadata.ts`.

## Current Thermal-Quality Visual Encoding

There are currently two separate thermal-quality color definitions:

### Backend raster palette

Defined in `backend/common/src/main/scala/org/soaringmeteo/out/Raster.scala` for `xc-potential`.

This controls the map overlay PNG colors.

### Frontend legend/detail palette

Defined in `frontend/src/layers/ThQ.tsx`.

This controls:

- the map key shown in the UI
- thermal-quality squares in location summaries
- thermal-quality coloring reused by meteograms

Therefore, the current palette is duplicated. If only the backend changes, the main raster may become color-blind-friendly while the legend and detailed views remain inconsistent.

## Current Settings Pattern

The frontend settings dialog is defined in `frontend/src/Settings.tsx`.

Current user settings are stored client-side in local storage via `frontend/src/State.tsx`.

The existing “Show the map overlay key” option works as follows:

1. `Settings.tsx` renders a checkbox.
2. The checkbox calls `props.domain.showMapKey(value)`.
3. `Domain.showMapKey(...)` updates local state and persists it to local storage.
4. UI components react to the state and show or hide the key.

This is a good pattern to reuse for a “Daltonian-compatible thermal quality” option.

## Key Finding For The Requested Change

The request mentions “backend changes”, but in the current codebase the thermal-quality color choice is not backend-only.

It spans both layers:

- backend:
  raster PNG color map for `xc-potential`
- frontend:
  legend, summary squares, meteogram colors, and settings

So a complete implementation requires coordinated changes in both backend and frontend.

## Recommended Design For Daltonian-Compatible Thermal Quality

### Goal

Allow the user to optionally switch the thermal-quality visualization to an accessibility-friendly palette without changing the underlying `xcFlyingPotential` values.

### Recommended scope

Use a user-facing setting in the frontend, but have the backend generate both raster variants.

This is the cleanest model because:

- the map overlay itself is a backend-generated raster asset
- the setting is user-specific and therefore belongs in frontend state/local storage
- the frontend can switch the raster path and the legend/detail palette consistently

### Proposed backend change

Generate two raster variants for thermal quality:

- default:
  `xc-potential`
- Daltonian-friendly:
  `xc-potential-daltonian`

Implementation outline:

1. Refactor `Raster.scala` so the thermal-quality color map is defined once by name.
2. Add a second `ColorMap` for the Daltonian-friendly palette.
3. Add a second raster definition with a different path.
4. Keep the numeric extractor identical: `intData(_.xcFlyingPotential)`.

This keeps:

- meteorological computation unchanged
- frontend switching simple
- caching/static hosting straightforward

### Why not make the backend choose one palette globally?

Because the option is user-specific and should behave like the existing settings menu toggle. A global backend switch would affect every user equally and would not match the requested interaction model.

### Why not keep it frontend-only?

The main map layer is a backend-produced PNG raster. The frontend cannot recolor that raster accurately without extra client-side processing, which would be more complex and less robust than serving a second backend-produced asset.

## Proposed frontend wiring

To match the existing “Show the map overlay key” behavior:

1. Add a new boolean setting to `State`:
   - e.g. `daltonianThqShown` or `daltonianThqEnabled`
2. Persist it in local storage, exactly like `mapKeyShown`.
3. Add a checkbox in `Settings.tsx`.
4. Make `ForecastMetadata.urlOfRasterAtHourOffset(...)` or a higher-level selector choose:
   - `xc-potential`
   - or `xc-potential-daltonian`
5. Update `frontend/src/layers/ThQ.tsx` to choose between:
   - the current palette
   - a Daltonian-safe palette
6. Update `frontend/src/diagrams/Meteogram.tsx`, which currently imports the same thermal-quality color scale, so detailed views stay consistent.

## Palette recommendation

For accessibility, avoid a red-green progression.

A good option is a sequential palette with strong lightness ordering, for example something in the spirit of:

- dark gray / navy
- blue
- teal
- yellow
- off-white

Important properties:

- monotonic lightness progression
- distinguishable under deuteranopia and protanopia
- still intuitive for “poor -> excellent”

For a first implementation, the Daltonian palette should remain discrete at the same thresholds:

- 10
- 20
- 30
- 40
- 50
- 60
- 70
- 80
- 90
- 100

That avoids changing any legend semantics or numeric interpretation.

## Suggested backend implementation sketch

In `Raster.scala`:

- extract current color maps into named vals, for example:
  - `defaultXcPotentialColorMap`
  - `daltonianXcPotentialColorMap`
- register two rasters:
  - `Raster("xc-potential", intData(_.xcFlyingPotential), defaultXcPotentialColorMap, RgbPngEncoding)`
  - `Raster("xc-potential-daltonian", intData(_.xcFlyingPotential), daltonianXcPotentialColorMap, RgbPngEncoding)`

This is intentionally additive. It does not break existing URLs, and existing clients continue to work.

## Future Wind-Speed Accessibility

Wind accessibility should be handled separately.

The wind layer in this codebase is not a backend-colored raster like thermal quality. It is mostly vector-tile data styled by the frontend. That means wind accessibility will likely require:

- frontend styling changes for vector arrows
- possibly frontend legend changes
- maybe diagram styling changes for wind in meteograms and soundings

So thermal quality is a good first target because it has a simpler additive path: dual raster generation plus palette switching.

## Recommended Implementation Order

1. Add backend support for `xc-potential-daltonian`.
2. Add frontend setting and local-storage persistence.
3. Switch the map raster path based on the setting.
4. Switch the ThQ legend/detail/meteogram palette based on the same setting.
5. Validate visual consistency between map overlay, key, summaries, and diagrams.
6. Only then design the wind-speed accessibility mode.

## Practical Conclusion

For this repository, the correct architecture is:

- backend computes the metric and publishes both raster variants
- frontend owns the user preference and selects which variant to display

That matches the current static-asset pipeline and the existing settings model.
