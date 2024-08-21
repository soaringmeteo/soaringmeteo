import {createEffect, createResource, getOwner, JSX, lazy, runWithOwner, Show } from 'solid-js';
import { insert, render, style } from 'solid-js/web';

import { initializeMap, MapHooks } from './map/Map';
import {Domain} from './State';
import { BurgerButton } from './BurgerButton';
import { hooks } from "./css-hooks";
import {LayerKeys} from "./LayerKeys";
import { HelpButton } from './help/HelpButton';
import {Localized} from "./i18n";
import {fetchGfsForecastRuns, fetchWrfForecastRuns} from "./data/ForecastMetadata";

const PeriodSelectors = lazy(() => import('./PeriodSelector').then(module => ({ default: module.PeriodSelectors })));

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

  // PeriodSelectors displays the buttons to move over time. When we click on those buttons, it
  // calls `onHourOffsetChanged`, which we handle by updating our `state`, which is propagated
  // back to these components.
  // LayersSelector displays the configuration button and manages the canvas overlay.
  return <>
    <style innerHTML={ hooks } />
    <span style={{ position: 'absolute', top: 0, left: 0, 'z-index': 200 /* must be above the “period selector” */ }}>
        <BurgerButton domain={props.domain} />
      </span>
    <PeriodSelectors domain={props.domain} locationClicks={props.mapHooks.locationClicks} />
    <LayerKeys domain={props.domain} />
    <span
        style={{
          position: 'absolute',
          right: '.5rem',
          bottom: '.5rem',
        }}
    >
        <HelpButton domain={props.domain} overMap={true} />
      </span>
  </>
};

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
