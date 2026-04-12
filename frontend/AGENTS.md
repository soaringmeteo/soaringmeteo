# SoaringMeteo — Frontend

The frontend is a single-page application that renders an interactive map with soaring weather overlays. It consumes static assets (PNG rasters, MVT vector tiles, JSON files) produced by the backend and displays them on an OpenLayers map. Built with TypeScript, SolidJS, OpenLayers, Vite, and Paraglide-JS.

## Scope

This file applies to work under `frontend/`.

It extends the repository-wide instructions in [`../AGENTS.md`](../AGENTS.md) and takes precedence for frontend files.

For setup, local development commands, build steps, deployment, and forecast format versioning, see [`../CONTRIBUTING.md`](../CONTRIBUTING.md).

## Entry Point & Bootstrap

- `index.ts` — Registers the PWA service worker and calls `start()` from `App.tsx`.
- `App.tsx` — `start()` initializes the OpenLayers map, then renders a `<Loader>` component that fetches `forecast.json` for both GFS and WRF, creates the central `Domain` state object, and renders the `<App>` component tree. `<App>` wires reactive effects to update the primary raster layer and wind vector tile layer whenever the state changes.

## Application State (`State.tsx`)

The `Domain` class is the central state manager. It holds a SolidJS store (`State`) with:

- **`model`** — Currently selected NWP model (GFS or WRF), including its name, available zones, and time step (3 h for GFS, 1 h for WRF).
- **`forecastMetadata`** — Currently selected forecast run (`ForecastMetadata`).
- **`selectedZone`** — Currently selected geographic zone (e.g., Europe & Africa, Central Alps).
- **`hourOffset`** — Currently selected time step within the forecast run.
- **`primaryLayer` / `windLayer`** — Currently selected primary and wind map layers.
- **`primaryLayerEnabled` / `windLayerEnabled`** — Whether each layer is visible.
- **`detailedView`** — If set, shows a location-specific summary, meteogram, or sounding diagram.
- **Settings:** `windNumericValuesShown`, `utcTimeShown`, `mapKeyShown`.

All preferences are persisted to `localStorage` and URL query parameters (`model`, `zone`, `lat`, `lng`, `z`, `lang`).

`Domain` provides methods to change every aspect of the state: `setModel()`, `setZone()`, `setHourOffset()`, `nextDay()`, `previousDay()`, `setPrimaryLayer()`, `setWindLayer()`, `showLocationForecast()`, `hideLocationForecast()`, etc.

## Data Layer (`src/data/`)

### `ForecastMetadata.ts`

- Fetches `data/<formatVersion>/gfs/forecast.json` and `data/<formatVersion>/wrf/forecast.json` at startup.
- Parses available runs, zones, and their raster/vector-tile parameters (projection, extent, resolution, zoom levels, tile size).
- Provides URL builders for raster PNGs (`urlOfRasterAtHourOffset`) and MVT tiles (`urlOfVectorTilesAtHourOffset`).
- `fetchLocationForecasts(zone, lat, lng)` — Finds the closest grid point, computes which 4×4 cluster file to fetch (e.g., `locations/12-34.json`), and returns a `LocationForecasts` object.
- `formatVersion` (currently 7) must match the backend.

### `LocationForecasts.ts`

Parses the compact JSON produced by the backend into typed domain objects:

- `LocationForecasts` — Elevation + array of `DayForecasts`.
- `DayForecasts` — Thunderstorm risk (0–4) + array of `DetailedForecast`.
- `DetailedForecast` — All data for one time step: XC potential (0–100), thermal velocity (m/s), boundary layer (depth, wind, cumulus clouds), surface (temperature, dew point, wind), cloud cover, rain (total + convective), mean sea level pressure, isotherm 0°C, altitude profiles (`AboveGround[]`), and wind at named altitude levels (`DetailedWinds`).

### `Model.ts`

Type definitions for `Zone` (raster extent/projection/resolution, vector tile parameters), `Model` (name, zones, time step), and `ModelName` (`'gfs' | 'wrf'`).

## Map (`src/map/`)

### `Map.ts`

Initializes the OpenLayers map with:

- **Base layer** — XYZ tile layer (custom SoaringMeteo tiles or MapTiler).
- **Primary layer** — `ImageLayer` displaying a `ImageStatic` source (PNG raster overlay at 35% opacity). Updated reactively when the selected layer/zone/time step changes.
- **Wind layer** — `VectorTileLayer` displaying MVT source. Wind arrows are rendered as rotated icons (10 speed-based images from 0 to 45+ km/h) with optional numeric speed labels. Updated reactively.
- **Marker layer** — Shows a pin icon at the selected location.

Registers a custom `WRF` projection via proj4 (Lambert Conformal Conic centered on the Alps).

Map position and zoom are persisted in `localStorage` and URL query parameters.

Returns `MapHooks` — an interface used by `App.tsx` to update layers, show/hide the marker, and center the view.

### `Overlay.tsx`

A modal overlay container used by the burger menu.

## Layer System (`src/layers/`)

Each layer implements the `Layer` interface (defined in `Layer.tsx`):

```typescript
type Layer = {
  key: string              // unique identifier
  name: Accessor<string>   // translated display name
  title: Accessor<string>  // translated legend title
  dataPath: string         // backend asset path prefix (e.g., 'xc-potential')
  reactiveComponents(props): ReactiveComponents
}
```

`reactiveComponents` returns:
- **`summarizer`** — Fetches location JSON and extracts summary data for the popup.
- **`mapKey`** — The color scale legend shown on the map.
- **`help`** — Help text for the help modal.

### Primary layers (raster overlays)

| File | Layer | `dataPath` |
|------|-------|------------|
| `ThQ.tsx` | XC Flying Potential (0–100%) | `xc-potential` |
| `SoaringLayerDepth.tsx` | Soaring Layer Depth (250–2500 m) | `soaring-layer-depth` |
| `ThermalVelocity.tsx` | Thermal Velocity (0.25–3.0 m/s) | `thermal-velocity` |
| `CloudsRain.tsx` | Clouds & Rain | `clouds-rain` |
| `CumuliDepth.tsx` | Cumuli Depth | `cumulus-depth` |

Each defines a `ColorScale` matching the backend's color map, used for both the map key legend and the popup summary coloring.

### Wind layers (vector tile overlays)

All defined in `Wind.tsx`:

| Layer | `dataPath` | Data source |
|-------|------------|-------------|
| Surface Wind | `wind-surface` | `surface.wind` |
| Boundary Layer Wind | `wind-boundary-layer` | `boundaryLayer.wind` |
| Soaring Layer Top Wind | `wind-soaring-layer-top` | `winds.soaringLayerTop` |
| 300 m AGL Wind | `wind-300m-agl` | `winds._300MAGL` |
| 2000 m AMSL Wind | `wind-2000m-amsl` | `winds._2000MAMSL` |
| 3000 m AMSL Wind | `wind-3000m-amsl` | `winds._3000MAMSL` |
| 4000 m AMSL Wind | `wind-4000m-amsl` | `winds._4000MAMSL` |

### `Layers.tsx`

Registry: maps all layer keys to `Layer` objects. Used by `State.tsx` to restore a layer selection from `localStorage`.

### `ColorScale.ts`

Utility class for discrete and interpolated color scales. Used by primary layers for their map keys and summary formatting.

## Diagrams (`src/diagrams/`)

Canvas-based visualizations rendered on `<canvas>` elements.

### `Diagram.ts`

Base drawing abstraction over `CanvasRenderingContext2D`. Provides a local coordinate system (origin at bottom-left, y-axis pointing up) and methods for lines, rectangles, text, shapes, and cumulus cloud drawing. Also provides `Scale` (linear mapping between domain and pixel range) and helpers for elevation levels and temperature ranges. Handles high-DPI canvas scaling.

### `Meteogram.tsx`

Time-series diagram showing forecast data across multiple time steps. Composed of five stacked sub-diagrams:

1. **ThQ bar** — XC Flying Potential per time step, color-coded.
2. **Thermal velocity bar** — Color-coded thermal updraft speed.
3. **High-altitude air** — Cloud cover above ~5000 m.
4. **Main air diagram** — Boundary layer depth (green), sky (blue), inversion layers (highlighted), cumulus clouds, wind arrows at each altitude, isotherm 0°C line, QNH pressure curve, and cloud cover by altitude.
5. **Rain & surface** — Total and convective rain bars, surface temperature/dew point curves, thunderstorm risk icons (lightning bolts).

Left and right key canvases show elevation (m), rain (mm), temperature (°C), and pressure (hPa) axes.

### `Sounding.tsx`

Vertical profile (SkewT-like) diagram for a single time step. Shows:

- Temperature and dew point curves color-coded by lapse rate: yellow (absolutely unstable), orange (conditionally unstable), black (stable), magenta (inversion).
- Boundary layer depth and cumulus cloud base/top.
- Wind arrows at each altitude level.
- Cloud cover at each level.
- Zoom in/out toggle (focused on soaring layer vs. full atmosphere to 12 km).

### `Clouds.ts`

Helper for drawing cloud cover symbols at varying density.

## UI Components

### `LocationDetails.tsx`

Appears when the user clicks the map. Three view modes:

- **Summary** — Table with key values (XC potential, thermal velocity, soaring layer depth, cloud cover, wind speed) for the current layer and wind layer.
- **Meteogram** — Horizontal scrollable time-series chart (lazy-loaded from `Meteogram.tsx`).
- **Sounding** — Vertical profile diagram (lazy-loaded from `Sounding.tsx`).

Toggle buttons switch between the three modes. Clicking a different map location updates the view.

### `PeriodSelector.tsx` (lazy-loaded as `HourSelectorAndMeteogram`)

Top bar with hour-by-hour time step buttons (3 h steps for GFS, 1 h for WRF). When a meteogram is open, the meteogram is shown inline below the hour selector with a synchronized scroll position.

### `DaySelector.tsx`

Bottom bar with day navigation: `-24`, `-timeStep`, `+timeStep`, `+24` buttons, and a day picker dropdown. For GFS, it shifts the hour offset by 24 h. For WRF, it switches between distinct forecast runs.

### `Burger.tsx` / `BurgerButton.tsx`

Hamburger menu (top-right) containing:
- Layer selector (primary layers, wind layers, model/zone/run selection).
- Settings (wind numeric values, UTC time, map key visibility, language).
- Links to other sections of the SoaringMeteo website.

### `LayersSelector.tsx`

Within the burger menu: radio buttons for primary and wind layers, model toggle (GFS/WRF), zone selector, and forecast run selector. Includes enable/disable checkboxes for each layer.

### `LayerKeys.tsx`

Floating color scale legend on the map (can be toggled via settings).

### `Settings.tsx`

Settings panel: wind numeric values toggle, UTC time toggle, map key toggle, language selector.

### `help/`

- `HelpButton.tsx` — "?" button that opens a help modal.
- `Help.tsx` — Modal with layer-specific documentation text.
- `data.ts` — Static help content data.

## Internationalization (`i18n.tsx`)

- Uses **Paraglide-JS** (Inlang ecosystem) for compile-time i18n.
- Message files in `messages/` (JSON): `en.json`, `fr.json`, `de.json`, `it.json`, `es.json`, `pl.json`, `pt.json`, `sk.json`.
- `Localized` component provides the `I18nContext` to the entire app.
- `useI18n()` hook returns `lang`, `setLang`, `m` (messages accessor), and `zoneLabel` (translates zone IDs).
- Language detection order: URL parameter → localStorage → browser locale → English fallback.
- Messages are compiled to `src/generated-i18n/` by the `@inlang/paraglide-js-adapter-vite` plugin.

## Build & Development

### Prerequisites

Node.js 18+ (via nvm).

### Commands

```bash
cd frontend
npm ci              # Install dependencies
npm run start       # Dev server on http://localhost:3000
npm run compile     # Paraglide compile + TypeScript type-check
npm run build       # Production build (Vite)
npm run deploy      # compile + build + rsync to production
```

### Vite Configuration (`vite.config.ts`)

- Base path: `/v2/`
- Plugins: `vite-plugin-solid`, `@inlang/paraglide-js-adapter-vite`, `vite-plugin-pwa` (service worker for offline), custom dev middleware serving `../backend/target/forecast/data` at `/v2/data`.
- Code splitting: `ol` and `solid-js` in separate chunks.
- PWA manifest with app icons and standalone display mode.

## Key Dependencies

- **SolidJS** (`solid-js`) — Reactive UI framework. Fine-grained reactivity with signals and stores.
- **OpenLayers** (`ol`) — Map rendering, tile layers, vector tile layers, projections, interactions.
- **proj4** — Custom projection support (WRF Lambert Conformal Conic).
- **Vite** — Bundler and dev server.
- **Paraglide-JS** (`@inlang/paraglide-js`) — Compile-time i18n with tree-shaking.
- **`@css-hooks/solid`** — CSS-in-JS with hover/media support in SolidJS.
- **`vite-plugin-pwa`** — Service worker generation for offline capability.
- **plausible-tracker** — Privacy-friendly analytics.
