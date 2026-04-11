# SoaringMeteo

SoaringMeteo (<https://soaringmeteo.org>) is an open-source weather forecast website for soaring (glider) pilots. It processes numerical weather prediction model output and displays meteorological data relevant to soaring flight — thermals, cloud cover, wind at various altitudes, soaring layer depth, XC flying potential, and more — as interactive map overlays with detailed per-location forecasts.

## Architecture

The project is split into two main parts: a Scala backend that produces forecast data assets, and a TypeScript/SolidJS frontend that displays them on an interactive map.

### Backend (`backend/`)

**Stack:** Scala 2.13, sbt, JDK 17, GeoTrellis, NetCDF/GRIB2 libraries

The backend has three modules:

- **`common/`** — Shared utilities for GRIB/NetCDF extraction, raster image generation, vector tile generation, JSON output, and meteorological computations (thermals, wind, clouds, XC potential, temperature profiles).
- **`gfs/`** — GFS pipeline. Downloads GRIB2 files from NOAA's Global Forecast System (~25 km resolution), extracts soaring-relevant variables, and produces PNG raster overlays, MVT vector tiles, and JSON location-detail files for every forecast time step.
- **`wrf/`** — WRF pipeline. Reads NetCDF output from the Weather Research & Forecasting model (2–6 km resolution over the Alps, run on SoaringMeteo's own servers) and produces the same kinds of assets.

The backend outputs static files consumed by the frontend:
- **PNG rasters** — color-coded map overlays (one per variable, time step, and zone)
- **MVT vector tiles** — wind barbs/arrows at multiple zoom levels
- **JSON files** — per-location detailed forecasts and `forecast.json` metadata listing available runs and zones

### Frontend (`frontend/`)

**Stack:** TypeScript, SolidJS, OpenLayers, Vite, Paraglide-JS (i18n)

The frontend is a single-page application that renders an interactive map with weather overlays. Key features:

- **Map layers** — Users select a primary layer (XC Flying Potential, Soaring Layer Depth, Thermal Velocity, Clouds & Rain, Cumuli Depth) and an independent wind layer (surface, 300 m AGL, 2000/3000/4000 m AMSL, boundary layer top, soaring layer top).
- **Time navigation** — Hour-by-hour slider for WRF, 3-hour steps for GFS, plus a day selector.
- **Location details** — Click the map to fetch per-grid-point JSON and view a summary popup, meteogram, or sounding diagram.
- **Model & zone switching** — Toggle between GFS (global) and WRF (regional Alps). Multiple geographic zones.
- **Internationalization** — 7 languages (EN, FR, DE, IT, ES, PL, PT, SK).

Key source directories:
- `src/data/` — Forecast metadata fetching, location forecast loading, model/zone definitions.
- `src/layers/` — One file per layer type, a registry (`Layers.tsx`), and shared types (`Layer.tsx`).
- `src/map/` — OpenLayers map initialization and hooks.
- `src/diagrams/` — Meteogram and sounding diagram rendering.

## Data Flow

```
NWP Model Run (NOAA GFS / WRF)
        │
        ▼
  Backend (Scala)
  ├─ Downloads GRIB2 or reads NetCDF files
  ├─ Extracts soaring-relevant variables
  └─ Writes static assets (PNG, MVT, JSON)
        │
        ▼  served as static files
  Frontend (SolidJS + OpenLayers)
  ├─ Fetches forecast.json for available runs/zones
  ├─ Loads PNG rasters as map image layers
  ├─ Loads MVT tiles as wind overlay
  └─ On click: fetches JSON for location details
        │
        ▼
  Interactive soaring weather map
```

