import {Accessor, createEffect, createResource, createSignal, JSX, on, Show} from "solid-js";
import {showCoordinates, showDate} from "./shared";
import {Domain} from "./State";
import {LocationForecasts} from "./data/LocationForecasts";
import {toLonLat} from "ol/proj";
import {MapBrowserEvent} from "ol";
import {Meteogram, Sounding} from "./DetailedView";
import { HelpButton } from "./help/HelpButton";
import {buttonStyle, diagramsIndex, roundButtonStyle, surfaceOverMap} from "./styles/Styles";
import { css } from "./css-hooks";
import {useI18n} from "./i18n";
import {gfsName} from "./data/Model";

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
        }}
      >
        <Show
          when={ detailedView.viewType !== 'summary' /* The summary view shows the location by itself */ }
          fallback={ <ForecastSummary domain={props.domain} latitude={detailedView.latitude} longitude={detailedView.longitude} /> }
        >
          <div>
            <ModelAndLocationDetail
              domain={ props.domain }
              longitude={ detailedView.longitude }
              latitude={ detailedView.latitude }
            />, { (detailedView as Meteogram | Sounding).locationForecasts.elevation }m.
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
              ...roundButtonStyle,
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
const ForecastSummary = (props: {
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
        <ModelAndLocationDetail domain={ props.domain } longitude={ props.longitude } latitude={ props.latitude } />
        <Show when={resource()}>
          { resolvedResource => <>, {(resolvedResource())[0].elevation}m</> }
        </Show>.
      </div>
      <Show when={summaryResource()}>
        { summary => table(summary())}
      </Show>
    </>;
};

/** The model name and initialization time, and the selected location’s coordinates */
const ModelAndLocationDetail = (props: {
  domain: Domain
  longitude: number
  latitude: number
}): JSX.Element => {
  return <>
    <div>
      { props.domain.state.model.name === gfsName ? 'GFS' : 'WRF' }
      { ` (init. ${showDate(props.domain.state.forecastMetadata.init, { timeZone: props.domain.timeZone(), showWeekDay: true })}).` }
    </div>
    { showCoordinates(props.longitude, props.latitude, props.domain.state.model.name) }
  </>
}

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

export const SoundingDiagram = (props: { domain: Domain }): JSX.Element => {
  const noDiagram: { element: JSX.Element } = { element: <div /> };
  const [accessor, set] = createSignal(noDiagram);

  createEffect(() => {
    const detailedView = props.domain.state.detailedView;
    if (detailedView !== undefined && detailedView.viewType === 'sounding') {
      const forecast = detailedView.locationForecasts.atHourOffset(props.domain.state.hourOffset);
      if (forecast === undefined) set(noDiagram);
      else {
        import('./diagrams/Sounding').then(module => {
          const { key, view } = module.sounding(forecast, detailedView.locationForecasts.elevation, true, props.domain.state);
          const element = <div style={{
            'z-index': diagramsIndex,
            position: 'relative',
            display: 'inline-block',
            'margin-bottom': '-4px', // WTF
            'pointer-events': 'auto',
          }}
          >
            {key}
            {view}
          </div>;
          set({ element });
        });
      }
    } else {
      set(noDiagram);
    }
  });

  return <>{ accessor().element }</>
}
