# Current Location

This document describes the current-location feature on the map: the location overlay and the optional current-location button.

## Purpose

The feature gives the user a visual reference for their own position on top of the forecast layers and provides a quick way to recenter the map on the browser geolocation.

The current design separates two concerns:

- showing the user's current location on the map,
- showing a map button that recenters on the user's current location.

This follows the more standard interaction pattern where a location button recenters the map instead of acting as a visibility toggle.

## Implementation

The feature is implemented in the frontend in four parts:

- `frontend/src/State.tsx`
  Stores the geolocated position in `state.currentLocation` with `latitude`, `longitude`, and `accuracy`, and persists two separate settings:
  `state.currentLocationShown` controls whether the current-location overlay is visible;
  `state.currentLocationButtonShown` controls whether the map button is visible.
- `frontend/src/App.tsx`
  Reacts to `state.currentLocationShown` and `state.currentLocation` to show or hide the overlay, and configures the visibility and label of the map button.
- `frontend/src/map/Map.ts`
  Defines dedicated OpenLayers layers for the current-location overlay:
  one polygon layer for the accuracy area and one point layer for the center dot.
  It also defines an OpenLayers control button for "Center on my location".
- `frontend/src/Settings.tsx`
  Exposes separate settings for the current-location overlay and the current-location button.

## Rendering

The current-location overlay is rendered in two parts:

- a red center dot,
- a translucent accuracy area around that point.

The accuracy area is based on `position.coords.accuracy` from browser geolocation. To keep it readable at normal zoom levels, the rendered radius uses a minimum visible screen radius in addition to the real-world accuracy radius.

## Behavior

- Choosing "Center on my location" from the burger menu or clicking the map button requests browser geolocation and recenters the map.
- The map button does not toggle the overlay on and off.
- If `Show my current location on the map` is enabled, a successful geolocation request updates and displays the center dot and accuracy area.
- If `Show my current location on the map` is disabled, the overlay is hidden immediately and subsequent recenter actions do not redraw it.
- If `Show the current-location button` is disabled, the map button is hidden, but the burger-menu action still works.
- The existing marker used for forecast detail selection remains unchanged.
- The current-location overlay uses its own layers so it can coexist with the detailed forecast marker.

## Notes

- The feature depends on browser geolocation permissions.
- If geolocation access is denied or unavailable, the existing error message is shown and the map is not recentered.
