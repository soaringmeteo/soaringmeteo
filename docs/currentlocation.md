# Current Location

This document describes the current-location feature on the map: the location overlay and the current-location button.

## Purpose

The feature gives the user a visual reference for their own position on top of the forecast layers and provides a quick way to recenter the map on the browser geolocation.

The current design uses a standard interaction pattern where a location button recenters the map instead of acting as a visibility toggle.

## Implementation

The feature is implemented in the frontend in four parts:

- `frontend/src/State.tsx`
  Stores the geolocated position in `state.currentLocation` with `latitude`, `longitude`, and `accuracy`.
  It also persists `state.currentLocationButtonShown`, which controls whether the map button is visible.
- `frontend/src/App.tsx`
  Reacts to `state.currentLocation` to show or hide the overlay, renders the bottom-right stack of map controls, and renders the top-right toggle used to collapse or restore that stack.
- `frontend/src/map/Map.ts`
  Defines dedicated OpenLayers layers for the current-location overlay:
  one polygon layer for the accuracy area and one point layer for the center dot.
- `frontend/src/CurrentLocationButton.tsx`
  Renders the current-location button in the shared bottom-right control stack, between the map key and the help button.
- `frontend/src/Settings.tsx`
  Exposes the setting for the current-location button.

## Rendering

The current-location overlay is rendered in two parts:

- a red center dot,
- a translucent accuracy area around that point.

The accuracy area is based on `position.coords.accuracy` from browser geolocation. To keep it readable at normal zoom levels, the rendered radius uses a minimum visible screen radius in addition to the real-world accuracy radius.

## Behavior

- Clicking the map button requests browser geolocation and recenters the map.
- A successful geolocation request updates and displays the center dot and accuracy area.
- If `Show the current-location button` is disabled, the map button is hidden.
- The map key, current-location button, and help button are stacked together at the bottom right so they keep consistent spacing on desktop and mobile browsers.
- A top-right arrow can hide or restore the entire bottom-right stack.
- The top-right toggle uses up/down arrow glyphs and translated tooltips for hide/show behavior.
- The existing marker used for forecast detail selection remains unchanged.
- The current-location overlay uses its own layers so it can coexist with the detailed forecast marker.

## Notes

- The feature depends on browser geolocation permissions.
- If geolocation access is denied or unavailable, the existing error message is shown and the map is not recentered.
