import { createStore, SetStoreFunction, Store } from 'solid-js/store';
import { Forecast, LocationForecasts } from './data/Forecast';
import { ForecastMetadata } from './data/ForecastMetadata';

export type State = {
  // Currently selected forecast run
  forecastMetadata: ForecastMetadata
  // Currently displayed forecast
  forecast: Forecast
  // Delta with the forecast initialization time
  hourOffset: number
  // Selected layer on the map (XC flying potential, thermal velocity, etc.)
  primaryLayerKey: string
  // It is possible to also show a wind layer as an overlay
  windLayerKey: string
  windLayerEnabled: boolean
  // Whether to show numerical values instead of barbells
  windNumericValuesShown: boolean
  // If defined, the detailed forecast data for the selected location, and the type of detailed view to display
  detailedView: undefined | [LocationForecasts, DetailedViewType]
}

type DetailedViewType = 'meteogram' | 'sounding'

// Keys used to store the current display settings in the local storage
const selectedPrimaryLayerKey   = 'selected-primary-layer';
const selectedWindLayerKey      = 'selected-wind-layer';
const windLayerEnabledKey       = 'wind-layer-enabled';
const windNumericValuesShownKey = 'wind-numeric-values-shown';

// Keys used to model the layers in the state
export const boundaryLayerDepthKey   = 'boundary-layer-depth';
export const cloudCoverKey           = 'cloud-cover';
export const cumuliDepthKey          = 'cumuli-depth';
export const noneKey                 = 'none';
export const rainKey                 = 'rain';
export const thermalVelocityKey      = 'thermal-velocity';
export const xcFlyingPotentialKey    = 'xc-flying-potential';
export const surfaceWindKey          = 'surface-wind';
export const _300MAGLWindKey         = '300m-agl-wind';
export const boundaryLayerWindKey    = 'boundary-layer-wind';
export const boundaryLayerTopWindKey = 'boundary-layer-top-wind';

const loadStoredState = <A,>(key: string, parse: (raw: string) => A, defaultValue: A): A => {
  const maybeItem = window.localStorage.getItem(key);
  if (maybeItem === null) {
    return defaultValue
  } else {
    return parse(maybeItem);
  }
};

const loadLayer = (key: string, fallback: string): string =>
  loadStoredState(key, layerKey => layerKey, fallback);

const loadPrimaryLayer = (): string => 
  loadLayer(
    selectedPrimaryLayerKey,
    xcFlyingPotentialKey
  );

const savePrimaryLayer = (key: string): void => {
  window.localStorage.setItem(selectedPrimaryLayerKey, key);
};

const loadWindLayer = (): string => 
  loadLayer(
    selectedWindLayerKey,
    boundaryLayerWindKey
  );

const saveWindLayer = (key: string): void => {
  window.localStorage.setItem(selectedWindLayerKey, key);
};

const loadWindLayerEnabled = (): boolean =>
  loadStoredState(windLayerEnabledKey, raw => JSON.parse(raw), true);

const saveWindLayerEnabled = (value: boolean): void => {
  window.localStorage.setItem(windLayerEnabledKey, JSON.stringify(value));
};

const loadWindNumericValuesShown = (): boolean =>
  loadStoredState(windNumericValuesShownKey, raw => JSON.parse(raw), false);

const saveWindNumericValuesShown = (value: boolean): void => {
  window.localStorage.setItem(windNumericValuesShownKey, JSON.stringify(value));
};

/**
 * Manages the interactions with the state of the system.
 * 
 * The state of the system can be read via the `state` property.
 * To update the state, use the methods defined here.
 */
export class Domain {
  
  readonly state: Store<State>;
  private readonly setState: SetStoreFunction<State>;

  constructor (
    forecastMetadata: ForecastMetadata,
    hourOffset: number,
    currentForecast: Forecast
  ) {
    const primaryLayerKey        = loadPrimaryLayer();
    const windLayerKey           = loadWindLayer();
    const windLayerEnabled       = loadWindLayerEnabled();
    const windNumericValuesShown = loadWindNumericValuesShown();
  
    // FIXME handle map location and zoom here? (currently handled in /map/Map.ts)
    const [get, set] = createStore<State>({
      forecastMetadata: forecastMetadata,
      forecast: currentForecast,
      hourOffset: hourOffset,
      primaryLayerKey,
      windLayerKey,
      windLayerEnabled,
      windNumericValuesShown,
      detailedView: undefined
    }, { name: 'state' }); // See https://github.com/solidjs/solid/discussions/1414

    this.state = get;
    this.setState = set;
  }
  
  /** Change the forecast run to display */
  setForecastMetadata(forecastMetadata: ForecastMetadata): void {
    this.setState({ forecastMetadata })
  }

  /** Change the period to display in the current forecast run */
  setHourOffset(hourOffset: number): void {
    this.state.forecastMetadata.fetchForecastAtHourOffset(hourOffset)
      .then(forecast => {
        this.setState({ hourOffset, forecast });
      })
      .catch(error => {
        console.error(error);
        alert('Unable to retrieve forecast data');
      });
  }

  /** Change which primary layer to show. Valid keys are defined above in the file */
  setPrimaryLayer(key: string): void {
    savePrimaryLayer(key);
    this.setState({ primaryLayerKey: key })
  }

  /** Change which wind layer to show. Valid keys are defined above in the file */
  setWindLayer(key: string): void {
    saveWindLayer(key);
    this.setState({ windLayerKey: key })
  }

  /** Whether or not the wind layer should be shown. */
  enableWindLayer(enabled: boolean): void {
    saveWindLayerEnabled(enabled);
    this.setState({ windLayerEnabled: enabled })
  }

  /** Whether or not numerical values should be displayed instead of wind barbells */
  showWindNumericValues(windNumericValuesShown: boolean): void {
    saveWindNumericValuesShown(windNumericValuesShown);
    this.setState({ windNumericValuesShown })
  }

  /** Display the detailed view (meteogram or sounding) at the given location */
  showLocationForecast(latitude: number, longitude: number, viewType: DetailedViewType): void {
    this.state.forecastMetadata
      .fetchLocationForecasts(latitude, longitude)
      .then(locationForecasts => this.setState({ detailedView: [locationForecasts, viewType] }))
  }

  /** Hide the detailed view */
  hideLocationForecast(): void {
    this.setState({ detailedView: undefined })
  }

}
