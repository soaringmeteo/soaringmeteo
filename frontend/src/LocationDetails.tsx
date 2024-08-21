import {Accessor, createEffect, createResource, JSX, on, Show} from "solid-js";
import {showCoordinates, showDate} from "./shared";
import {Domain} from "./State";
import {LocationForecasts} from "./data/LocationForecasts";
import {toLonLat} from "ol/proj";
import {MapBrowserEvent} from "ol";
import {Meteogram, Sounding} from "./DetailedView";
import { HelpButton } from "./help/HelpButton";
import {buttonStyle, closeButton, surfaceOverMap} from "./styles/Styles";
import { css } from "./css-hooks";
import {useI18n} from "./i18n";

/**
 * Box showing the forecast details (summary, meteogram, or sounding) for the selected location.
 */
export const LocationDetails = (props: {
  locationClicks: Accessor<MapBrowserEvent<any> | undefined>
  domain: Domain
}): JSX.Element => {

  const { m } = useI18n();

  // Open the detailed view when the users click on the map
  createEffect(on(props.locationClicks, (event) => {
    if (event === undefined) {
      return
    }
    const [eventLng, eventLat] = toLonLat(event.coordinate);
    const maybePoint =
      props.domain.state.forecastMetadata.closestPoint(props.domain.effectiveZone(), eventLng, eventLat);
    if (maybePoint === undefined) {
      return
    }
    const [longitude, latitude] =
      props.domain.state.forecastMetadata.toLonLat(props.domain.effectiveZone(), maybePoint);

    const detailedViewType =
      props.domain.state.detailedView?.viewType || 'summary'
    props.domain.showLocationForecast(latitude, longitude, detailedViewType);
  }));

  // For now use 'keyed' to re-compute the whole detailed view because I could
  // not manage to make it work with fine-grained reactivity
  return <Show when={ props.domain.state.detailedView } keyed>
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
          'box-sizing': 'border-box',
          'user-select': 'text',
          'pointer-events': 'auto' // Disable 'pointer-events: none` from parent element
        }}
      >
        <Show
          when={ detailedView.viewType !== 'summary' /* The summary view shows the location by itself */ }
          fallback={ <LocationSummary domain={props.domain} latitude={detailedView.latitude} longitude={detailedView.longitude} /> }
        >
          <div>
            { showCoordinates(detailedView.longitude, detailedView.latitude, props.domain.state.model.name) }, { (detailedView as Meteogram | Sounding).locationForecasts.elevation }m.
            <Show when={ detailedView.viewType === 'sounding' }>
              &nbsp;{ showDate(props.domain.state.forecastMetadata.dateAtHourOffset(props.domain.state.hourOffset), { showWeekDay: true, timeZone: props.domain.timeZone() }) }.
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
            title={ m().locationSummaryLegend() }
            onClick={ () => props.domain.showLocationForecast(detailedView.latitude, detailedView.longitude, 'summary') }
          >
            { m().locationSummary() }
          </span>

          <span
            style={{ ...buttonStyle, ...(detailedView.viewType === 'meteogram' ? { 'background-color': 'lightgray' } : {}) }}
            title={ m().locationMeteogramLegend() }
            onClick={ () => props.domain.showLocationForecast(detailedView.latitude, detailedView.longitude, 'meteogram') }
          >
            { m().locationMeteogram() }
          </span>

          <span
            style={{ ...buttonStyle, ...(detailedView.viewType === 'sounding' ? { 'background-color': 'lightgray' } : {}) }}
            title={ m().locationSoundingLegend() }
            onClick={ () => props.domain.showLocationForecast(detailedView.latitude, detailedView.longitude, 'sounding') }
          >
            { m().locationSounding() }
          </span>

          <HelpButton domain={ props.domain } overMap={ false } />

          <div
            style={css({
              ...closeButton,
              'flex-shrink': 0,
              'border': '1px solid lightgray',
              hover: { 'background-color': 'lightgray' }
            } as JSX.CSSProperties)}
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
            .then<[LocationForecasts, Array<[Accessor<string>, JSX.Element]> | undefined] | undefined>(([primarySummary, windSummary]) =>
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
      const result: [LocationForecasts, Array<[Accessor<string>, JSX.Element]> | undefined] | undefined = resource();
      if (result !== undefined && result[1] !== undefined && result[1].length !== 0) {
        return result[1]
      } else {
        return undefined
      }
    };
    return <>
      <div>
        { showCoordinates(props.longitude, props.latitude, props.domain.state.model.name) }
        <Show when={resource()}>
          { resolvedResource => <>, {(resolvedResource())[0].elevation}m</> }
        </Show>.
      </div>
      <Show when={summaryResource()}>
        { summary => table(summary())}
      </Show>
    </>;
};

const table = (data: Array<[Accessor<string>, JSX.Element]>): JSX.Element => {
  const rows =
    data.map(([label, value]) => {
      return <tr><th style="text-align: right">{label()}:</th><td>{value}</td></tr>
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
