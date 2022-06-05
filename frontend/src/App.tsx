import { createEffect, createSignal, JSX } from 'solid-js';
import { createStore } from 'solid-js/store';
import { insert, render, style } from 'solid-js/web';

import { initializeMap } from './Map';
import { DetailedViewType, PeriodSelectors } from './PeriodSelector';
import { ForecastLayer } from './ForecastLayer';
import { ForecastMetadata, latestRun, showDate } from './data/ForecastMetadata';
import { Forecast, LocationForecasts } from './data/Forecast';
import * as L from 'leaflet';
import markerImg from './images/marker-icon.png';

/**
 * State managed by the `App` component
 */
type State = {
  // Currently selected forecast run
  forecastMetadata: ForecastMetadata
  // Currently displayed forecast
  forecast: Forecast
  detailedView: DetailedViewType
  // If defined, the detailed forecast data for the selected location
  locationForecasts: undefined | LocationForecasts
  // Delta with the forecast initialization time
  hourOffset: number
}

// TODO Load everything within App, and make it lazy
export const App = (forecastMetadatas: Array<ForecastMetadata>, forecastMetadata: ForecastMetadata, morningOffset: number, hourOffset: number, currentForecast: Forecast, containerElement: HTMLElement): void => {

  // The map *must* be initialized before we call the other constructors
  // It *must* also be mounted before we initialize it
  style(containerElement, { display: 'flex', 'align-items': 'stretch', 'align-content': 'stretch' });
  const mapElement = <div style={ { flex: 1 } } />;
  insert(containerElement, mapElement);

  const [canvas, map] = initializeMap(mapElement);

  render(() => {
    const [state, setState] = createStore<State>({
      forecastMetadata: forecastMetadata,
      forecast: currentForecast,
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

    map.on('keydown', (e: any) => {
      const event = e.originalEvent as KeyboardEvent;
      if (event.key === 'Escape') {
        setState({ locationForecasts: undefined });
      }
    });

    // Signal of “popup requests”: when the users click on the map, they request a popup
    // to be displayed with numerical information about the visible layer.
    const [popupRequest, setPopupRequest] = createSignal<undefined | L.LeafletMouseEvent>(undefined);
    map.on('click', (event: L.LeafletMouseEvent) => {
      setPopupRequest(event);
    });
    // Clear popup requests when the users close the popup
    const locationDetailsPopup =
      L.popup()
        .on("remove", () => { setPopupRequest(undefined) })

    /**
     * @param latitude  Latitude of the popup to open
     * @param longitude Longitude of the popup to open
     * @param content   Content of the popup (must be a root element)
     */
    const openLocationDetailsPopup = (latitude: number, longitude: number, content: JSX.Element): void => {
      locationDetailsPopup
        .setLatLng([latitude, longitude])
        .setContent(content)
        .openOn(map);
    };

    const fetchLocationForecasts = (latitude: number, longitude: number): void => {
      state.forecastMetadata
        .fetchLocationForecasts(latitude, longitude)
        .then(locationForecasts => setState({ locationForecasts }))
    };

    const updateHourOffset = (hourOffset: number): void => {
      state.forecastMetadata.fetchForecastAtHourOffset(hourOffset)
        .then(forecast => {
          setState({ hourOffset, forecast });
        })
        .catch(error => {
          console.error(error);
          alert('Unable to retrieve forecast data');
        });
    };

    // PeriodSelector displays the buttons to move over time. When we click on those buttons, it
    // calls `onHourOffsetChanged`, which we handle by updating our `state`, which is propagated
    // back to these components.
    // ForecastLayer displays the map overlay.
    return <>
      <PeriodSelectors
        forecastMetadata={state.forecastMetadata}
        locationForecasts={state.locationForecasts}
        detailedView={state.detailedView}
        hourOffset={state.hourOffset}
        morningOffset={morningOffset}
        onHourOffsetChanged={updateHourOffset}
        onDetailedViewClosed={() => setState({ locationForecasts: undefined })}
      />,
      <ForecastLayer
        hourOffset={state.hourOffset}
        detailedView={state.detailedView}
        forecastMetadatas={forecastMetadatas}
        currentForecastMetadata={state.forecastMetadata}
        currentForecast={state.forecast}
        canvas={canvas}
        popupRequest={popupRequest}
        onChangeDetailedView={(value: DetailedViewType) => setState({ detailedView: value })}
        onChangeForecastMetadata={(value: ForecastMetadata) => setState({ forecastMetadata: value })}
        onFetchLocationForecasts={fetchLocationForecasts}
        openLocationDetailsPopup={openLocationDetailsPopup}
      />
    </>
  }, mapElement);

};
