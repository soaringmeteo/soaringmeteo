import { createEffect } from 'solid-js';
import { createStore } from 'solid-js/store';
import { insert, render, style } from 'solid-js/web';

import { initializeMap } from './Map';
import { DetailedViewType, PeriodSelectors } from './PeriodSelector';
import { ForecastLayer } from './ForecastLayer';
import { ForecastMetadata, latestForecast, showDate } from './data/ForecastMetadata';
import { LocationForecasts } from './data/Forecast';
import * as L from 'leaflet';
import markerImg from './images/marker-icon.png';

/**
 * State managed by the `App` component
 */
type State = {
  // Currently displayed forecast
  forecastMetadata: ForecastMetadata
  detailedView: DetailedViewType
  // If defined, the detailed forecast data for the selected location
  locationForecasts: undefined | LocationForecasts
  // Delta with the forecast initialization time
  hourOffset: number
}

export const App = (forecasts: Array<ForecastMetadata>, containerElement: HTMLElement): void => {

  // The map *must* be initialized before we call the other constructors
  // It *must* also be mounted before we initialize it
  style(containerElement, { display: 'flex', 'align-items': 'stretch', 'align-content': 'stretch' });
  const mapElement = <div style={ { flex: 1 } } />;
  insert(containerElement, mapElement);

  const [canvas, map] = initializeMap(mapElement);

  render(() => {
    // TODO Compute based on user preferred time zone (currently hard-coded for central Europe)
    // Number of hours to add to 00:00Z to be on the morning forecast period (e.g., 9 for Switzerland)
    const morningOffset = 9;
    const noonOffset    = morningOffset + 3 /* hours */; // TODO Abstract over underlying NWP model resolution
    const [forecastMetadata, hourOffset] = latestForecast(forecasts, noonOffset)

    const [state, setState] = createStore<State>({
      forecastMetadata: forecastMetadata,
      detailedView: 'meteogram',
      locationForecasts: undefined,
      hourOffset
    });

    createEffect(() => {
      map.attributionControl.setPrefix(`Initialization: ${showDate(state.forecastMetadata.init)}`);
    });

    const selectedLocationMarker: L.Marker = L.marker([0, 0], { icon: L.icon({ iconUrl: markerImg, iconSize: [25, 41] }) });
    createEffect(() => {
      const selectedLocation = state.locationForecasts;
      if (selectedLocation !== undefined) {
        selectedLocationMarker.setLatLng([selectedLocation.latitude, selectedLocation.longitude]);
        selectedLocationMarker.addTo(map);
      } else {
        selectedLocationMarker.remove();
      }
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      state.forecastMetadata
        .fetchLocationForecasts(e.latlng.lat, e.latlng.lng)
        .then(locationForecasts => setState({ locationForecasts }))
    });
  
    map.on('keydown', (e: any) => {
      const event = e.originalEvent as KeyboardEvent;
      if (event.key === 'Escape') {
        setState({ locationForecasts: undefined });
      }
    });

    return <>
      <PeriodSelectors
        forecastMetadata={state.forecastMetadata}
        locationForecasts={state.locationForecasts}
        detailedView={state.detailedView}
        hourOffset={state.hourOffset}
        morningOffset={morningOffset}
        onHourOffsetChanged={(value: number) => setState({ hourOffset: value })}
        onDetailedViewClosed={() => setState({ locationForecasts: undefined })}
      />,
      <ForecastLayer
        hourOffset={state.hourOffset}
        detailedView={state.detailedView}
        forecasts={forecasts}
        currentForecast={state.forecastMetadata}
        canvas={canvas}
        onChangeDetailedView={(value: DetailedViewType) => setState({ detailedView: value })}
        onChangeForecast={(value: ForecastMetadata) => setState({ forecastMetadata: value })}
      />
    </>
  }, mapElement);

}
