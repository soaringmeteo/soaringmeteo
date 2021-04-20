import { createEffect, createState } from 'solid-js';
import h from 'solid-js/h'
import { insert, render, style } from 'solid-js/web'

import { initializeMap } from './Map';
import { PeriodSelectors } from './PeriodSelector';
import { ForecastLayer } from './ForecastLayer';
import { ForecastMetadata } from './data/ForecastMetadata';
import { LocationForecasts } from './data/Forecast';

export const App = (forecasts: Array<ForecastMetadata>, containerElement: HTMLElement): void => {

  // The map *must* be initialized before we call the other constructors
  // It *must* also be mounted before we initialize it
  style(containerElement, { display: 'flex', 'align-items': 'stretch', 'align-content': 'stretch' });
  const mapElement = h('div', { style: { flex: 1 } });
  insert(containerElement, mapElement);

  const [canvas, map] = initializeMap(mapElement);

  render(() => {
    // TODO Compute based on user preferred time zone (currently hard-coded for central Europe)
    // Number of hours to add to 00:00Z to be on the morning forecast period (e.g., 9 for Switzerland)
    const morningOffset = 9;
    const noonOffset    = 12;
    const forecastMetadata = forecasts[forecasts.length - 1];
    const forecastInitOffset = +forecastMetadata.init.getUTCHours();
    // Tomorrow, noon period
    const hourOffset = (forecastInitOffset === 0 ? 0 : 24) + noonOffset - forecastInitOffset;

    type State = {
      // Currently displayed forecast
      forecastMetadata: ForecastMetadata
      detailedView: 'meteogram' | 'sounding'
      // If defined, the detailed forecast data for the selected location
      locationForecasts: undefined | LocationForecasts
      // Delta with the forecast initialization time
      hourOffset: number
    }

    const [state, setState] = createState<State>({
      forecastMetadata: forecasts[forecasts.length - 1],
      detailedView: 'meteogram',
      locationForecasts: undefined,
      hourOffset
    });

    createEffect(() => {
      map.attributionControl.setPrefix(`Initialization: ${state.forecastMetadata.init.toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}`);
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

    return [
      h(PeriodSelectors, {
        forecastMetadata: () => state.forecastMetadata,
        locationForecasts: () => state.locationForecasts,
        detailedView: () => state.detailedView,
        hourOffset: () => state.hourOffset,
        morningOffset: () => morningOffset,
        onHourOffsetChanged: (value: number) => setState({ hourOffset: value }),
        onDetailedViewClosed: () => setState({ locationForecasts: undefined })
      }),
      h(ForecastLayer, {
        hourOffset: () => state.hourOffset,
        detailedView: () => state.detailedView,
        forecasts: () => forecasts,
        currentForecast: () => state.forecastMetadata,
        canvas,
        onChangeDetailedView: (value: 'meteogram' | 'sounding') => setState({ detailedView: value }),
        onChangeForecast: (value: ForecastMetadata) => setState({ forecastMetadata: value })
      })
    ]
  }, mapElement);

}
