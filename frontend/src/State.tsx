import { Context, createContext, JSX, useContext } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Forecast, LocationForecasts } from './data/Forecast';
import { ForecastMetadata } from './data/ForecastMetadata';
import { Layer } from './layers/Layer';
import { boundaryLayerWindKey, layerByKey, xcFlyingPotentialKey } from './layers/Layers';

export type State = {
  // Currently selected forecast run
  forecastMetadata: ForecastMetadata
  // Currently displayed forecast
  forecast: Forecast
  // Delta with the forecast initialization time
  hourOffset: number
  // Selected layer on the map (XC flying potential, thermal velocity, etc.)
  primaryLayer: Layer
  // It is possible to also show a wind layer as an overlay
  windLayer: Layer
  windLayerEnabled: boolean
  // Whether to show numerical values instead of barbells
  windNumericValuesShown: boolean
  // If defined, the detailed forecast data for the selected location, and the type of detailed view to display
  detailedView: undefined | [LocationForecasts, DetailedViewType]
}

type DetailedViewType = 'meteogram' | 'sounding'

type ContextType = [
  State,
  {
    setForecastMetadata: (forecastMetadata: ForecastMetadata) => void
    setHourOffset: (hourOffset: number) => void
    setPrimaryLayer: (key: string, layer: Layer) => void
    setWindLayer: (key: string, layer: Layer) => void
    enableWindLayer: (enabled: boolean) => void
    showWindNumericValues: (showNumericalValues: boolean) => void
    showLocationForecast: (latitude: number, longitude: number, viewType: DetailedViewType) => void
    hideLocationForecast: () => void
  }
]

const SoarContext: Context<ContextType | undefined> = createContext<ContextType>();

// Keys used to store the selected layers in the local storage
const selectedPrimaryLayerKey   = 'selected-primary-layer';
const selectedWindLayerKey      = 'selected-wind-layer';
const windLayerEnabledKey       = 'wind-layer-enabled';
const windNumericValuesShownKey = 'wind-numeric-values-shown';

const loadStoredState = <A,>(key: string, parse: (raw: string) => A, defaultValue: A): A => {
  const maybeItem = window.localStorage.getItem(key);
  if (maybeItem === null) {
    return defaultValue
  } else {
    return parse(maybeItem);
  }
};

const loadLayer = (key: string, fallback: Layer): Layer =>
  loadStoredState(key, layerKey => layerByKey(layerKey) ?? fallback, fallback);

const loadPrimaryLayer = (): Layer => 
  loadLayer(
    selectedPrimaryLayerKey,
    layerByKey(xcFlyingPotentialKey) as Layer // We know we are safe here
  );


const savePrimaryLayer = (key: string): void => {
  window.localStorage.setItem(selectedPrimaryLayerKey, key);
};

const loadWindLayer = (): Layer => 
  loadLayer(
    selectedWindLayerKey,
    layerByKey(boundaryLayerWindKey) as Layer // We know we are safe here
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

export const StateProvider = (props: {
  forecastMetadata: ForecastMetadata
  hourOffset: number
  currentForecast: Forecast 
  children: JSX.Element 
}): JSX.Element => {

  const primaryLayer           = loadPrimaryLayer();
  const windLayer              = loadWindLayer();
  const windLayerEnabled       = loadWindLayerEnabled();
  const windNumericValuesShown = loadWindNumericValuesShown();

  // FIXME handle map location and zoom here? (currently handled in /map/Map.ts)
  const [state, setState] = createStore<State>({
    forecastMetadata: props.forecastMetadata,
    forecast: props.currentForecast,
    hourOffset: props.hourOffset,
    primaryLayer,
    windLayer,
    windLayerEnabled,
    windNumericValuesShown,
    detailedView: undefined
  }, { name: 'state' }); // See https://github.com/solidjs/solid/discussions/1414

  const context = [
    state,
    {
      setForecastMetadata: (forecastMetadata: ForecastMetadata) => {
        setState({ forecastMetadata })
      },
      setHourOffset: (hourOffset: number) => {
        state.forecastMetadata.fetchForecastAtHourOffset(hourOffset)
          .then(forecast => {
            setState({ hourOffset, forecast });
          })
          .catch(error => {
            console.error(error);
            alert('Unable to retrieve forecast data');
          });
      },
      setPrimaryLayer: (key: string, layer: Layer): void => {
        savePrimaryLayer(key);
        setState({ primaryLayer: layer })
      },
      setWindLayer: (key: string, layer: Layer): void => {
        saveWindLayer(key);
        setState({ windLayer: layer })
      },
      enableWindLayer: (enabled: boolean): void => {
        saveWindLayerEnabled(enabled);
        setState({ windLayerEnabled: enabled })
      },
      showWindNumericValues: (windNumericValuesShown: boolean) => {
        saveWindNumericValuesShown(windNumericValuesShown);
        setState({ windNumericValuesShown })
      },
      showLocationForecast: (latitude: number, longitude: number, viewType: DetailedViewType): void => {
        state.forecastMetadata
          .fetchLocationForecasts(latitude, longitude)
          .then(locationForecasts => setState({ detailedView: [locationForecasts, viewType] }))
      },
      hideLocationForecast: () => {
        setState({ detailedView: undefined })
      }
    }
  ]

  return <SoarContext.Provider value={context}>
    {props.children}
  </SoarContext.Provider>
};

export const useState = (): ContextType => {
  const maybeContext = useContext(SoarContext);
  if (maybeContext === undefined) throw Error("Implementation error.")
  else return maybeContext
};
