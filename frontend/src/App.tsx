import {createEffect, createResource, getOwner, JSX, lazy, runWithOwner, Accessor, Show} from 'solid-js';
import {insert, render, style} from 'solid-js/web';
import {MapBrowserEvent} from "ol";

import {initializeMap, MapHooks} from './map/Map';
import {Domain} from './State';
import {BurgerButton} from './BurgerButton';
import { styleSheet } from "./css-hooks";
import {LayerKeys} from "./LayerKeys";
import {HelpButton} from './help/HelpButton';
import {Localized} from "./i18n";
import {fetchGfsForecastRuns, fetchWrfForecastRuns} from "./data/ForecastMetadata";
import {LocationDetails, SoundingDiagram} from "./LocationDetails";
import {diagramsIndex} from "./styles/Styles";

const HourSelectorAndMeteogram =
  lazy(() => import('./PeriodSelector').then(module => ({ default: module.HourSelectorAndMeteogram })));
const DaySelector =
  lazy(() => import('./DaySelector').then(module => ({ default: module.DaySelector })));

const App = (props: {
  domain: Domain,
  mapHooks: MapHooks
}): JSX.Element => {

  // Update primary layer
  createEffect(() => {
    const url = props.domain.urlOfRasterAtCurrentHourOffset();
    const zone = props.domain.effectiveZone();
    const projection = zone.raster.proj;
    const extent = zone.raster.extent;
    if (props.domain.state.primaryLayerEnabled) {
      props.mapHooks.setPrimaryLayerSource(url, projection, extent);
    } else {
      props.mapHooks.hidePrimaryLayer();
    }
  });

  // Update wind layer
  createEffect(() => {
    const vectorTiles = props.domain.effectiveZone().vectorTiles;
    const url = props.domain.urlOfVectorTilesAtCurrentHourOffset();
    if (props.domain.state.windLayerEnabled) {
      props.mapHooks.setWindLayerSource(
          url,
          vectorTiles.minZoom,
          vectorTiles.extent,
          vectorTiles.zoomLevels - 1,
          vectorTiles.tileSize
      );
    } else {
      props.mapHooks.hideWindLayer();
    }
  });
  createEffect(() => {
    props.mapHooks.enableWindNumericalValues(props.domain.state.windNumericValuesShown);
  });

  // Marker when detailed view is open
  createEffect(() => {
    const detailedView = props.domain.state.detailedView;
    if (detailedView !== undefined) {
      props.mapHooks.showMarker(detailedView.latitude, detailedView.longitude);
    } else {
      props.mapHooks.hideMarker();
    }
  });

  return <>
    <style innerHTML={ styleSheet() } />
    <AppLayout domain={props.domain} mapHooks={props.mapHooks} />
  </>
};

const AppLayout = (props: {
  domain: Domain
  mapHooks: MapHooks
}): JSX.Element =>
  <>
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      'pointer-events': 'none',
      display: 'flex',
      'flex-flow': 'column',
      'align-items': 'stretch',
      gap: '0px',
      'font-size': '0.8125rem',
    }}>
      <TopZone domain={props.domain} />
      <MiddleZone domain={props.domain} locationClicks={props.mapHooks.locationClicks} />
      <BottomZone domain={props.domain} />
    </div>
    <BurgerButton domain={props.domain} />
  </>;

const enablePointerEvents: JSX.CSSProperties = { 'pointer-events': 'auto' };

// hour selector and meteograms
const TopZone = (props: {
  domain: Domain
}): JSX.Element =>
  <div style={{ position: 'relative', 'line-height': 0, 'z-index': diagramsIndex }}>
    <HourSelectorAndMeteogram domain={props.domain} />
  </div>;

// expands vertically to fill the remaining space, displays detailed information on the selected
// location, and the sounding diagrams
const MiddleZone = (props: {
  domain: Domain
  locationClicks: Accessor<MapBrowserEvent<any> | undefined>
}): JSX.Element =>
  <div
    style={{
      'flex-grow': 1,
      position: 'relative',
      display: 'flex',
      'flex-direction': 'column',
      'align-items': 'flex-start',
    }}
  >
    <LayerKeys domain={props.domain} />
    <SoundingDiagram domain={props.domain} />
    <span
      style={{
        ...enablePointerEvents,
        'z-index': diagramsIndex,
        position: 'relative'
      }}
    >
      <LocationDetails locationClicks={props.locationClicks} domain={props.domain} />
    </span>
  </div>;

// day selector and help button
const BottomZone = (props: { domain: Domain }): JSX.Element =>
  <div style={{
    display: 'flex',
    'justify-content': 'center',
    position: 'relative',
  }}>
    <span style={ enablePointerEvents }>
      <DaySelector domain={props.domain} />
    </span>
    <span
      style={{
        position: 'absolute',
        right: '.5rem',
        bottom: '.5rem',
        ...enablePointerEvents,
      }}
    >
      <HelpButton domain={props.domain} overMap={true}/>
    </span>
  </div>;

const Loader = ((props: {
  mapHooks: MapHooks
}): JSX.Element => {
  const owner = getOwner(); // Remember the tracking scope because it is lost when the promise callback is called
  const [loadedDomain] = createResource(() =>
      Promise
          .all([
            fetchGfsForecastRuns(),
            fetchWrfForecastRuns()
          ])
          .then(([[gfsRuns, gfsZones], [wrfRuns, wrfZones]]) => {
            return runWithOwner(owner, () => new Domain(gfsRuns, gfsZones, wrfRuns, wrfZones));
          })
          .catch(error => {
            console.log(error);
            alert('Unable to retrieve forecast data. Try again later or contact equipe@soaringmeteo.org if the problem persists.');
            return undefined
          })
  );
  return <Show when={ loadedDomain() }>
    { domain => <App domain={domain()} mapHooks={props.mapHooks} /> }
  </Show>
});

export const start = (containerElement: HTMLElement): void => {
  // The map *must* be initialized before we call the other constructors
  // It *must* also be mounted before we initialize it
  style(containerElement, { display: 'flex', 'align-items': 'stretch', 'align-content': 'stretch' });
  const mapElement = <div style={ { flex: 1 } } /> as HTMLElement;
  insert(containerElement, mapElement);

  const mapHooks = initializeMap(mapElement);

  render(() => <Localized><Loader mapHooks={mapHooks} /></Localized>, mapElement);
};
