import {Domain} from "./State";
import {Accessor, createEffect, createResource, JSX, Show} from "solid-js";
import {toLonLat} from "ol/proj";
import {surfaceOverMap} from "./styles/Styles";
import {showCoordinates, showDate} from "./shared";
import {MapBrowserEvent} from "ol";

export const LayerKeys = (props: {
  domain: Domain
  popupRequest: Accessor<undefined | MapBrowserEvent<any>>
  openLocationDetailsPopup: (latitude: number, longitude: number, content: HTMLElement) => void
  closeLocationDetailsPopup: () => void
}): JSX.Element => {
  const primaryLayerComponents = () => props.domain.primaryLayerReactiveComponents();
  const windLayerComponents    = () => props.domain.windLayerReactiveComponents();

  const layerKeyEl =
    <div style={{
    position: 'absolute',
      bottom: '40px',
      left: '5px',
      'background-color': 'rgba(255, 255,  255, 0.5',
      'font-size': '11px',
      'padding': '5px',
      'text-align': 'center'
  }}>
    {primaryLayerComponents().mapKey}
  </div>;

  // Show a popup with a summary when the user clicks on the map (TODO move to another file)
  createEffect(() => {
    const event = props.popupRequest();
    if (event === undefined) {
      return
    }

    const state = props.domain.state;
    const [eventLng, eventLat] = toLonLat(event.coordinate);
    const maybePoint =
      state.forecastMetadata.closestPoint(state.zone, eventLng, eventLat);
    if (maybePoint === undefined) {
      return
    }

    const [longitude, latitude] =
      state.forecastMetadata.toLonLat(state.zone, maybePoint);

    const summaryPromise =
      state.windLayerEnabled ?
        Promise.all([
          primaryLayerComponents().summarizer().summary(latitude, longitude),
          windLayerComponents().summarizer().summary(latitude, longitude)
        ])
          .then(([primarySummary, windSummary]) => primarySummary?.concat(windSummary || [])) :
        primaryLayerComponents().summarizer().summary(latitude, longitude);
    const [summaryResource] =
      createResource(() => summaryPromise.then(summary =>
        summary !== undefined && summary.length !== 0 ? summary : undefined
      ));
    const content =
      <div style={{ ...surfaceOverMap, background: 'white', padding: '.7em', 'font-size': '0.8125rem', 'text-align': 'left', 'border-radius': '5px' }}>
    <span
      style={{ position: 'absolute', top: '2px', right: '8px', cursor: 'pointer', 'font-weight': 'bold' }}
    onClick={ () => props.closeLocationDetailsPopup() }
    title="Close"
      >
          ×
        </span>
        <div>Grid point: { showCoordinates(longitude, latitude, props.domain.state.model) }</div>
    <div>Forecast for {showDate(state.forecastMetadata.dateAtHourOffset(state.hourOffset), { showWeekDay: true, timeZone: props.domain.timeZone() })}</div>
    <Show when={ summaryResource() }>
      { summary => table(summary) }
    </Show>
    <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-around' }}>
    <button
      onClick={ () => props.domain.showLocationForecast(eventLat, eventLng, 'meteogram') }
    title="Meteogram for this location"
      >
      Meteogram
      </button>
      <button
    onClick={ () => props.domain.showLocationForecast(eventLat, eventLng, 'sounding') }
    title="Sounding for this time and location"
      >
      Sounding
      </button>
      </div>
      </div> as HTMLElement;
    props.openLocationDetailsPopup(latitude, longitude, content);
  });

  return layerKeyEl
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
