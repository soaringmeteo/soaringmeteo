# SoaringMeteo — Backend

The backend processes numerical weather prediction (NWP) model output and produces static assets (PNG rasters, MVT vector tiles, JSON files) consumed by the frontend. It is written in Scala 2.13, built with sbt, and runs on JDK 17.

## Scope

This file applies to work under `backend/`.

It extends the repository-wide instructions in [`../AGENTS.md`](../AGENTS.md) and takes precedence for backend files.

For setup, local development commands, testing, asset generation, deployment, and forecast format versioning, see [`../CONTRIBUTING.md`](../CONTRIBUTING.md).

## Modules

The backend is organized into three sbt modules.

### `common/` — Shared utilities

Package: `org.soaringmeteo` (and sub-packages `grib`, `out`, `util`).

This module contains:

- **Meteorological domain types** — `Forecast.scala` is the central data class representing a single grid-point forecast at one time step. It carries boundary layer depth, thermal velocity, cloud cover, convective clouds, wind at various altitudes (`Winds`), rain, surface temperature/dew point, XC flying potential, soaring layer depth, and an altitude-indexed `SortedMap` of `AirData` (wind, temperature, dew point, cloud cover per pressure level).
- **Meteorological computations:**
  - `Thermals.scala` — Estimates thermal updraft velocity using the Lenschow–Stephens convective velocity scale (w*), and computes the soaring layer depth (capped at cloud base when convective clouds are present).
  - `XCFlyingPotential.scala` — Produces a 0–100 XC flying potential score from thermal velocity, soaring layer depth, and boundary layer wind using logistic functions.
  - `ConvectiveClouds.scala` — Cloud base/top detection.
  - `Wind.scala` / `Winds.scala` — Wind vector types (u/v components) and named altitude levels (surface, 300 m AGL, 2000/3000/4000 m AMSL, boundary layer top, soaring layer top).
  - `Temperatures.scala` — Temperature profile utilities.
  - `Interpolation.scala` — Numerical interpolation helpers.
- **Location forecasts** — `LocationForecasts.scala` aggregates `Forecast` data for one grid point over multiple time steps, groups them by day, computes thunderstorm risk per day, and provides a JSON encoder that produces the compact format consumed by the frontend (meteograms and sounding diagrams).
- **GRIB file reading** — `grib/Grib.scala` wraps the ucar NetCDF/GRIB library (`GridDataset`) to read features (variables) from GRIB2 or NetCDF files by name, supporting 3D and 4D slicing by time, elevation, y, x.
- **Output generation** (`out/` sub-package):
  - `Raster.scala` — Generates color-coded PNG raster images for each forecast variable using GeoTrellis `ColorMap` rendering. Defines the five primary rasters: XC Potential, Soaring Layer Depth, Thermal Velocity, Clouds & Rain, and Cumuli Depth, each with its own color scale.
  - `VectorTiles.scala` — Generates MVT (Mapbox Vector Tile) files for wind overlays. Defines seven wind layers (surface, boundary layer, soaring layer top, 300 m AGL, 2000/3000/4000 m AMSL). Points are reprojected to Web Mercator, partitioned into tiles at multiple zoom levels, and down-sampled at lower zooms for rendering density control.
  - `JsonData.scala` — Writes per-location JSON files. Groups grid points into 4×4 clusters to reduce the number of files (e.g. `locations/12-34.json`). Each file contains a 2D array of `LocationForecasts` JSON, one per grid point in the cluster.
  - `ForecastMetadata.scala` — Manages the `forecast.json` metadata file that the frontend reads at startup. Describes available forecast runs, zones (id, label, raster projection/extent/resolution, vector tile parameters), and handles merging new runs with previous runs while purging expired history.
  - `package.scala` — Defines `formatVersion` (currently 7), which must stay in sync with the frontend. Also provides `deleteOldData` (removes expired run directories) and `touchMarkerFile` (signals that new data is available).

### `gfs/` — GFS Pipeline

Package: `org.soaringmeteo.gfs` (and sub-packages `in`, `out`).

Entry point: `Main.scala` (CLI via decline library).

**What it does:** Downloads GRIB2 files from NOAA's Global Forecast System (0.25° resolution, ~25 km), extracts soaring-relevant variables, and produces the static assets.

**Key files:**

- `Main.scala` — CLI entry point. Accepts a GRIBs directory, an output directory, an optional run initialization time (`00`/`06`/`12`/`18`), and a `--reuse-previous-grib-files` flag. Orchestrates the full pipeline: download → process → write JSONs → update `forecast.json` → clean up old data.
- `Settings.scala` — Configuration (via Typesafe Config). Defines forecast time resolution (3 h), space resolution (0.25°), forecast length, subgrid definitions (loaded from config), download rate limit, history retention, and the NOAA GFS URL.
- `Subgrid.scala` — Defines a rectangular subgrid within the global GFS domain (e.g., Europe & Africa, Americas) by lat/lon bounds. Computes grid dimensions, coordinate sequences, and `VectorTiles.Parameters`.
- `DataPipeline.scala` — Core pipeline. For each (hourOffset, subgrid) pair, it: downloads the GRIB file, reads forecast data from it (single-threaded due to ucar library thread-safety), generates raster PNGs and vector tiles (on a separate thread), and persists the raw forecast data to an H2 database for later JSON generation. Uses `Future`-based parallelism with controlled concurrency.
- `GribDownloader.scala` — Downloads GRIB2 files from NOAA with rate limiting.
- `JsonWriter.scala` — After all time steps are processed, reads persisted data from the H2 store and writes per-location JSON files. For each grid point, it selects the 3 most relevant time steps per day (morning, noon, afternoon, based on the point's longitude). Also writes `forecast.json` metadata describing all available zones.
- `in/ForecastRun.scala` — Determines the latest available GFS run by probing the NOAA server.
- `in/GfsGrib.scala` — Reads a GFS GRIB2 file and extracts all soaring-relevant variables into `Forecast` objects for every grid point.
- `in/IsobaricVariables.scala` — Extracts isobaric-level data (wind, temperature, humidity at various pressure levels).
- `out/Store.scala` — H2 database persistence layer (via Slick). Stores raw `Forecast` data keyed by (init time, subgrid, hour offset, x, y), enabling efficient retrieval grouped by location for JSON generation.

### `wrf/` — WRF Pipeline

Package: `org.soaringmeteo.wrf`.

Entry point: `Main.scala` (CLI via decline library).

**What it does:** Reads NetCDF output files from the Weather Research & Forecasting model (run on SoaringMeteo's own servers at 2–6 km resolution over the Alps) and produces the same kind of static assets as the GFS pipeline.

**Key files:**

- `Main.scala` — CLI entry point. Accepts an output directory, the run initialization time (e.g. `2023-11-21T12:00Z`), the time of the first time step, and one or more `.nc` input files.
- `Settings.scala` — Minimal settings: forecast history retention (4 days).
- `Grid.scala` — Maps WRF domain identifiers (`d02`–`d05`) to output metadata. Defines four grids: Alps Overview (d02, 6 km), Central Alps (d03, 2 km), Southern Alps (d04, 2 km), Eastern Alps (d05, 2 km).
- `DataPipeline.scala` — Processes each input NetCDF file: reads data via `NetCdf.read`, generates raster PNGs and vector tiles for all time steps, writes per-location JSON files, then updates `forecast.json` and cleans up expired runs.
- `NetCdf.scala` — Reads WRF NetCDF output using the `Grib` wrapper. Extracts all time steps and grid points, computing for each: boundary layer depth, thermal velocity (via Lenschow–Stephens), soaring layer depth, convective clouds, wind at multiple altitudes, temperature/dew point profiles, cloud cover, rain, XC flying potential, and more. Handles WRF-specific variables (PBLH, HGT, UMET/VMET, TC, DP, etc.) and computes raster/vector-tile metadata (projection, extent, resolution) from the NetCDF coordinate system.

## Output Structure

Both pipelines write assets under `<output-dir>/<formatVersion>/<model>/`:

```
<formatVersion>/<model>/
├── forecast.json                          # Metadata: available runs, zones, extents
└── <runPath>/                             # e.g. "2024-03-15T12"
    └── <zoneId>/                          # e.g. "europe-africa" or "central-alps"
        ├── xc-potential/<offset>.png       # Raster overlays (one PNG per hour offset)
        ├── soaring-layer-depth/<offset>.png
        ├── thermal-velocity/<offset>.png
        ├── clouds-rain/<offset>.png
        ├── cumulus-depth/<offset>.png
        ├── wind-surface/<offset>/          # MVT vector tiles
        │   ├── 0-0-0.mvt
        │   ├── 1-0-0.mvt
        │   └── ...
        ├── wind-boundary-layer/<offset>/
        ├── wind-soaring-layer-top/<offset>/
        ├── wind-300m-agl/<offset>/
        ├── wind-2000m-amsl/<offset>/
        ├── wind-3000m-amsl/<offset>/
        ├── wind-4000m-amsl/<offset>/
        └── locations/                      # Per-location JSON (clustered)
            ├── 0-0.json
            ├── 0-1.json
            └── ...
```

## Build & Run

**Prerequisites:** JDK 17, sbt.

```bash
cd backend
sbt
```

From the sbt shell:

```sbt
# Compile
compile

# Run tests
test

# Generate GFS assets for development (downloads a small subset of data)
makeGfsAssets

# Generate WRF assets from local .nc files
makeWrfAssets

# Build distribution tarballs
gfs/Universal/packageZipTarball
wrf/Universal/packageZipTarball
```

Production usage:

```bash
# GFS
bin/gfs [--gfs-run-init-time <00|06|12|18>] [--reuse-previous-grib-files] <GRIBs-dir> <output-dir>

# WRF
bin/wrf <output-dir> <init-time> <first-time-step> <input-files>...
```

## Key Dependencies

- **GeoTrellis** (`geotrellis-raster`, `geotrellis-vector-tile`) — Raster rendering, color maps, vector tile generation, coordinate reprojection.
- **ucar grib** (`edu.ucar:grib`) — GRIB2 and NetCDF file reading.
- **Squants** — Type-safe quantities (Length, Velocity, Temperature, Pressure, etc.).
- **Circe** — JSON encoding/decoding for location forecasts and metadata.
- **os-lib** — File system operations.
- **Decline** — Command-line argument parsing.
- **Slick + H2** (GFS only) — Local database for intermediate forecast data storage.
- **Logback** — Logging.
