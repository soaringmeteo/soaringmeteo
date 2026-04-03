# Current Location Marker

This document describes the "red circle on current location" feature on the map.

## Purpose

When the user chooses "Center on my location" from the burger menu, the map recenters on the browser geolocation and displays a red circle at that position. This gives the user a clear visual reference for their own location on top of the forecast layers.

## Implementation

The feature is implemented in the frontend in three parts:

- `frontend/src/State.tsx`
  Stores the geolocated position in `state.currentLocation` when browser geolocation succeeds.
- `frontend/src/App.tsx`
  Reacts to `state.currentLocation` and calls the map hooks to show or hide the current-location indicator.
- `frontend/src/map/Map.ts`
  Defines a dedicated OpenLayers vector layer for the current location and renders it as a red circle.

## Behavior

- The red circle is only shown after the browser successfully returns the user's location.
- The existing marker used for forecast detail selection remains unchanged.
- The current-location indicator uses its own map layer so it can coexist with the detailed forecast marker.

## Notes

- The feature depends on browser geolocation permissions.
- If geolocation access is denied or unavailable, the existing error message is shown and no red circle is displayed.
