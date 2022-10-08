import { Context, createContext, JSX, useContext } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Forecast, LocationForecasts } from './data/Forecast';
import { ForecastMetadata } from './data/ForecastMetadata';
import { boundaryLayerWindLayer, Layer, xcFlyingPotentialLayer } from './ForecastLayer';

type State = {
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
  // If defined, the detailed forecast data for the selected location, and the type of detailed view to display
  detailedView: undefined | [LocationForecasts, DetailedViewType]
}

type DetailedViewType = 'meteogram' | 'sounding'

type ContextType = [
  State,
  {
    setForecastMetadata: (forecastMetadata: ForecastMetadata) => void
    setHourOffset: (hourOffset: number) => void
    setPrimaryLayer: (layer: Layer) => void
    setWindLayer: (layer: Layer) => void
    enableWindLayer: (enabled: boolean) => void
    showLocationForecast: (latitude: number, longitude: number, viewType: DetailedViewType) => void
    hideLocationForecast: () => void
  }
]

const SoarContext: Context<ContextType | undefined> = createContext<ContextType>();

export const StateProvider = (props: {
  forecastMetadata: ForecastMetadata
  hourOffset: number
  currentForecast: Forecast 
  children: JSX.Element 
}): JSX.Element => {

  // TODO load/save to local storage or indexeddb
  // FIXME handle map location and zoom here? (currently handled in /map/Map.ts)
  const [state, setState] = createStore<State>({
    forecastMetadata: props.forecastMetadata,
    forecast: props.currentForecast,
    hourOffset: props.hourOffset,
    primaryLayer: xcFlyingPotentialLayer,
    windLayer: boundaryLayerWindLayer,
    windLayerEnabled: true,
    detailedView: undefined
  });

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
      setPrimaryLayer: (layer: Layer): void => {
        setState({ primaryLayer: layer })
      },
      setWindLayer: (layer: Layer): void => {
        setState({ windLayer: layer })
      },
      enableWindLayer: (enabled: boolean): void => {
        setState({ windLayerEnabled: enabled })
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
  if (maybeContext === undefined) throw Error("Unable to initialize the application.")
  else return maybeContext
};
