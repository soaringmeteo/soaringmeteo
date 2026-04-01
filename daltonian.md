# Daltonian-Compatible Thermal Quality

## Purpose

This document explains the Daltonian-compatible thermal-quality change.

The goal is to let users switch the Thermal Quality, Thermal Velocity, and Soaring Layer Depth visualizations to a color-blind-friendly palette without changing the underlying forecast metrics.

The metric itself remains `xcFlyingPotential`. Only its visual encoding changes.

## Why This Change Touches Both Backend And Frontend

These layers are rendered in two different ways:

- backend-generated raster PNGs for the map overlay
- frontend color scales for the map key, location summary, and meteogram

Because of that split, changing only one side would make the UI inconsistent.

## Design

The implementation is additive:

- the backend still generates the existing `xc-potential` raster
- the backend also generates `xc-potential-daltonian`
- the backend also generates `thermal-velocity-daltonian`
- the backend also generates `soaring-layer-depth-daltonian`
- the frontend stores a user preference in local storage
- when the selected primary layer is one of the supported layers and the option is enabled, the frontend requests the matching `*-daltonian` raster
- the frontend also switches the matching legends and meteogram colors to the same palette

This keeps the feature user-specific while preserving the existing default behavior.

## Backend Changes

File:

- `backend/common/src/main/scala/org/soaringmeteo/out/Raster.scala`

The backend now defines default and Daltonian variants for:

- Thermal Quality
- Thermal Velocity
- Soaring Layer Depth

It publishes these extra raster paths:

- `xc-potential`
- `xc-potential-daltonian`
- `thermal-velocity`
- `thermal-velocity-daltonian`
- `soaring-layer-depth`
- `soaring-layer-depth-daltonian`

The extracted data is unchanged, so this change does not alter the meteorological computation.

## Frontend Changes

### User setting

Files:

- `frontend/src/Settings.tsx`
- `frontend/src/State.tsx`
- `frontend/messages/*.json`

The frontend adds a new persisted boolean setting:

- `daltonianThqEnabled`

This setting is exposed in the settings dialog and stored in local storage, following the same pattern as the existing display settings.

### Raster selection

File:

- `frontend/src/State.tsx`

The `Domain` chooses the raster path dynamically:

- if the active primary layer is Thermal Quality, Thermal Velocity, or Soaring Layer Depth and the Daltonian setting is enabled, it uses the corresponding `*-daltonian` raster
- otherwise it uses the layer’s normal `dataPath`

This ensures that only the supported overlays are affected.

### Frontend color scale selection

Files:

- `frontend/src/layers/ThQ.tsx`
- `frontend/src/layers/ThermalVelocity.tsx`
- `frontend/src/layers/SoaringLayerDepth.tsx`
- `frontend/src/diagrams/Meteogram.tsx`

The frontend defines:

- `defaultColorScale`
- `daltonianColorScale`

The selected scale is used consistently for:

- the map key
- the Thermal Quality squares in location summaries
- the Thermal Quality strip in the meteogram
- the Thermal Velocity strip in the meteogram

## Palette

The Daltonian-compatible palette keeps the same threshold values as the default palette:

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

Only the colors change. This preserves the meaning of the scale and avoids changing any forecast data semantics.

## What This Change Does Not Do

This change does not:

- modify the `xcFlyingPotential` computation
- change wind rendering
- require a forecast data format version bump

The change is additive because it introduces one extra raster path and a frontend preference that uses it.

## Affected Files

Backend:

- `backend/common/src/main/scala/org/soaringmeteo/out/Raster.scala`

Frontend:

- `frontend/src/Settings.tsx`
- `frontend/src/State.tsx`
- `frontend/src/layers/Layer.tsx`
- `frontend/src/layers/ThQ.tsx`
- `frontend/src/diagrams/Meteogram.tsx`
- `frontend/src/layers/CloudsRain.tsx`
- `frontend/src/layers/CumuliDepth.tsx`
- `frontend/src/layers/SoaringLayerDepth.tsx`
- `frontend/src/layers/ThermalVelocity.tsx`
- `frontend/src/layers/Wind.tsx`
- `frontend/messages/en.json`
- `frontend/messages/de.json`
- `frontend/messages/es.json`
- `frontend/messages/fr.json`
- `frontend/messages/it.json`
- `frontend/messages/pl.json`
- `frontend/messages/pt.json`
- `frontend/messages/sk.json`

## Rationale

Generating two raster variants in the backend is simpler and more robust than trying to recolor the overlay client-side.

Keeping the switch in the frontend is also the right ownership boundary, because this is a per-user accessibility preference rather than a global forecast property.
