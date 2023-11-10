import {Accessor, createEffect, createResource, JSX, on, Show} from "solid-js";
import {showCoordinates, showDate} from "./shared";
import {Domain} from "./State";
import {LocationForecasts} from "./data/LocationForecasts";
import {toLonLat} from "ol/proj";
import {MapBrowserEvent} from "ol";
import {Meteogram, Sounding} from "./DetailedView";
import {Help} from "./help/Help";
import {buttonStyle, closeButton, surfaceOverMap} from "./styles/Styles";
import hooks from "./css-hooks";

/**
 * Box showing the forecast details (summary, meteogram, or sounding) for the selected location.
 */
export const LocationDetails = (props: {
  locationClicks: Accessor<MapBrowserEvent<any> | undefined>
  domain: Domain
}): JSX.Element => {

  // Open the detailed view when the users click on the map
  createEffect(on(props.locationClicks, (event) => {
    if (event === undefined) {
      return
    }
    const [eventLng, eventLat] = toLonLat(event.coordinate);
    const maybePoint =
      props.domain.state.forecastMetadata.closestPoint(props.domain.state.zone, eventLng, eventLat);
    if (maybePoint === undefined) {
      return
    }
    const [longitude, latitude] =
      props.domain.state.forecastMetadata.toLonLat(props.domain.state.zone, maybePoint);

    const detailedViewType =
      props.domain.state.detailedView?.viewType || 'summary'
    props.domain.showLocationForecast(latitude, longitude, detailedViewType);
  }));

  return <Show when={ props.domain.state.detailedView }>
    { detailedView =>
      <div
        style={{
          ...surfaceOverMap,
          'border-radius': '0 0 3px 0',
          'display': 'inline-block',
          'background-color': 'white',
          'border-top': '1px solid darkgray',
          padding: '.35em',
          'max-width': '100vw',
          'box-sizing': 'border-box'
        }}
      >
        <Show
          when={ detailedView.viewType !== 'summary' /* The summary view shows the location by itself */ }
          fallback={ <LocationSummary domain={props.domain} latitude={detailedView.latitude} longitude={detailedView.longitude} /> }
        >
          <div>
            Location: { showCoordinates(detailedView.longitude, detailedView.latitude, props.domain.state.model) }, { (detailedView as Meteogram | Sounding).locationForecasts.elevation }m.
            <Show when={ detailedView.viewType === 'sounding' }>
              &nbsp;Time: { showDate(props.domain.state.forecastMetadata.dateAtHourOffset(props.domain.state.hourOffset), { showWeekDay: true, timeZone: props.domain.timeZone() }) }.
            </Show>
          </div>
        </Show>

        <div
          style={{
            display: 'flex',
            'flex-wrap': 'wrap',
            'align-items': 'center',
            'column-gap': '.3em'
          }}
        >
          <span
            style={{ ...buttonStyle, ...(detailedView.viewType === 'summary' ? { 'background-color': 'lightgray' } : {}) }}
            title="Summary of the forecast for this location"
            onClick={ () => props.domain.showLocationForecast(detailedView.latitude, detailedView.longitude, 'summary') }
          >
            Summary
          </span>

          <span
            style={{ ...buttonStyle, ...(detailedView.viewType === 'meteogram' ? { 'background-color': 'lightgray' } : {}) }}
            title="Meteogram for this location"
            onClick={ () => props.domain.showLocationForecast(detailedView.latitude, detailedView.longitude, 'meteogram') }
          >
            Meteogram
          </span>

          <span
            style={{ ...buttonStyle, ...(detailedView.viewType === 'sounding' ? { 'background-color': 'lightgray' } : {}) }}
            title="Sounding for this time and location"
            onClick={ () => props.domain.showLocationForecast(detailedView.latitude, detailedView.longitude, 'sounding') }
          >
            Sounding
          </span>

          <Help domain={ props.domain } overMap={ false } />

          <div
            style={hooks({
              ...closeButton,
              'flex-shrink': 0,
              'border': '1px solid lightgray',
              hover: { 'background-color': 'lightgray' }
            })}
            title='Hide'
            onClick={ () => props.domain.hideLocationForecast() }
          >
            ⨯
          </div>
        </div>
      </div>
    }
  </Show>

};

/** Forecast summary (wind speed, thermal velocity, etc.) at the selected location */
const LocationSummary = (props: {
  domain: Domain
  latitude: number
  longitude: number
}): JSX.Element => {
    const [resource] = createResource(
      () => ({
        windLayerEnabled: props.domain.state.windLayerEnabled,
        primaryLayerSummarizer: props.domain.primaryLayerReactiveComponents().summarizer(),
        windLayerSummarizer: props.domain.windLayerReactiveComponents().summarizer(),
      }),
      ({ windLayerEnabled, primaryLayerSummarizer, windLayerSummarizer }) => {
        if (windLayerEnabled) {
          return Promise.all([
            primaryLayerSummarizer.summary(props.latitude, props.longitude),
            windLayerSummarizer.summary(props.latitude, props.longitude)
          ])
            .then<[LocationForecasts, Array<[string, JSX.Element]> | undefined] | undefined>(([primarySummary, windSummary]) =>
              (primarySummary === undefined || windSummary === undefined) ?
                undefined :
                [primarySummary[0], primarySummary[1]?.concat(windSummary[1] || [])]
            )
        } else {
          return primaryLayerSummarizer.summary(props.latitude, props.longitude)
        }
      }
    );
    const summaryResource = () => {
      const result: [LocationForecasts, Array<[string, JSX.Element]> | undefined] | undefined = resource();
      if (result !== undefined && result[1] !== undefined && result[1].length !== 0) {
        return result[1]
      } else {
        return undefined
      }
    };
    return <>
      <div>
        Location: { showCoordinates(props.longitude, props.latitude, props.domain.state.model) }
        <Show when={resource()}>
          { ([locationForecasts]) => <>, {locationForecasts.elevation}m</> }
        </Show>.
      </div>
      <Show when={summaryResource()}>
        { summary => table(summary)}
      </Show>
    </>;
};

const table = (data: Array<[string, JSX.Element]>): JSX.Element => {
  const rows =
    data.map(([label, value]) => {
      return <tr><th>{label}:</th><td>{value}</td></tr>
    });
  if (rows.length === 0) {
    return <div></div>
  } else {
    return <table>
      <tbody>
      { rows }
      </tbody>
    </table>;
  }
};
