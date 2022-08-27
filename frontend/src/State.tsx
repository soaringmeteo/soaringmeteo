import { Context, createContext, JSX, useContext } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Forecast, LocationForecasts } from './data/Forecast';
import { ForecastMetadata } from './data/ForecastMetadata';

type State = {
  // Currently selected forecast run
  forecastMetadata: ForecastMetadata
  // Currently displayed forecast
  forecast: Forecast
  // Delta with the forecast initialization time
  hourOffset: number
  detailedView: DetailedViewType
  // If defined, the detailed forecast data for the selected location
  locationForecasts: undefined | LocationForecasts
}

type DetailedViewType = 'meteogram' | 'sounding'

type ContextType = [
  State,
  {
    setForecastMetadata: (forecastMetadata: ForecastMetadata) => void
    setHourOffset: (hourOffset: number) => void
    setDetailedView: (detailedView: DetailedViewType) => void
    fetchLocationForecasts: (latitude: number, longitude: number) => void
    clearLocationForecasts: () => void
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
  // TODO handle map location and zoom here?
  // TODO store preselected layer
  const [state, setState] = createStore<State>({
    forecastMetadata: props.forecastMetadata,
    forecast: props.currentForecast,
    hourOffset: props.hourOffset,
    detailedView: 'meteogram',
    locationForecasts: undefined
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
      setDetailedView: (detailedView: DetailedViewType) => {
        setState({ detailedView })
      },
      fetchLocationForecasts: (latitude: number, longitude: number): void => {
        state.forecastMetadata
          .fetchLocationForecasts(latitude, longitude)
          .then(locationForecasts => setState({ locationForecasts }))
      },
      clearLocationForecasts: () => {
        setState({ locationForecasts: undefined })
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
