import {createEffect, createSignal, JSX, lazy, Show} from 'solid-js';
import { insert, render, style } from 'solid-js/web';

import { initializeMap } from './map/Map';
import { LayersSelector } from './LayersSelector';
import {fetchRunsAndComputeInitialHourOffset, ForecastMetadata} from './data/ForecastMetadata';
import { Domain } from './State';
import { Burger } from './Burger';
import { Attribution } from './map/Attribution';
import {noLayer} from "./layers/None";

const Help = lazy(() => import('./help/Help').then(module => ({ default: module.Help })));
const PeriodSelectors = lazy(() => import('./PeriodSelector').then(module => ({ default: module.PeriodSelectors })));

export const start = (containerElement: HTMLElement): void => {

  // The map *must* be initialized before we call the other constructors
  // It *must* also be mounted before we initialize it
  style(containerElement, { display: 'flex', 'align-items': 'stretch', 'align-content': 'stretch' });
  const mapElement = <div style={ { flex: 1 } } /> as HTMLElement;
  insert(containerElement, mapElement);

  const mapHooks = initializeMap(mapElement);

  const App = (props: {
    domain: Domain
    forecastMetadatas: Array<ForecastMetadata>
    morningOffset: number
  }): JSX.Element => {

    // Update primary layer
    createEffect(() => {
      const url = props.domain.urlOfRasterAtCurrentHourOffset();
      const projection = props.domain.state.zone.raster.proj;
      const extent = props.domain.state.zone.raster.extent;
      if (props.domain.state.primaryLayer.key === noLayer.key) {
        mapHooks.hidePrimaryLayer();
      } else {
        mapHooks.setPrimaryLayerSource(url, projection, extent);
      }
    });

    // Update wind layer
    createEffect(() => {
      const vectorTiles = props.domain.state.zone.vectorTiles;
      const url = props.domain.urlOfVectorTilesAtCurrentHourOffset();
      if (props.domain.state.windLayerEnabled) {
        mapHooks.setWindLayerSource(
          url,
          vectorTiles.minZoom,
          vectorTiles.extent,
          vectorTiles.zoomLevels - 1
        );
      } else {
        mapHooks.hideWindLayer();
      }
    });
    createEffect(() => {
      mapHooks.enableWindNumericalValues(props.domain.state.windNumericValuesShown);
    });

    // Marker when detailed view is open
    createEffect(() => {
      const detailedView = props.domain.state.detailedView;
      if (detailedView !== undefined) {
        const selectedLocation = detailedView[0];
        mapHooks.showMarker(selectedLocation.latitude, selectedLocation.longitude);
      } else {
        mapHooks.hideMarker();
      }
    });

    // PeriodSelectors displays the buttons to move over time. When we click on those buttons, it
    // calls `onHourOffsetChanged`, which we handle by updating our `state`, which is propagated
    // back to these components.
    // LayersSelector displays the configuration button and manages the canvas overlay.
    return <>
      <span style={{ position: 'absolute', top: 0, left: 0, 'z-index': 200 /* must be above the “period selector” */ }}>
        <Burger domain={props.domain} />
      </span>
      <PeriodSelectors
        morningOffset={props.morningOffset}
        domain={props.domain}
      />
      <LayersSelector
        forecastMetadatas={props.forecastMetadatas}
        popupRequest={mapHooks.popupRequest}
        openLocationDetailsPopup={mapHooks.openPopup}
        closeLocationDetailsPopup={mapHooks.closePopup}
        domain={props.domain}
      />
      <span style={{ position: 'absolute', right: '.5em', bottom: '5em', 'text-align': 'right' }}>
        <Attribution domain={props.domain} />
        <Help domain={props.domain} />
      </span>
    </>
  }

  const Loader = ((): JSX.Element => {
    const [loaded, setLoaded] = createSignal<[Array<ForecastMetadata>, number, Domain]>();
    fetchRunsAndComputeInitialHourOffset()
      .then(([forecastMetadatas, forecastMetadata, morningOffset, hourOffset]) =>
        setLoaded([forecastMetadatas, morningOffset, new Domain(forecastMetadata, hourOffset)])
      )
      .catch(reason => {
        console.error(reason);
        alert('Unable to retrieve forecast data');
      });
    return <Show when={ loaded() }>
      { ([forecastMetadatas, morningOffset, domain]) => {
        return <App
          domain={domain}
          forecastMetadatas={forecastMetadatas}
          morningOffset={morningOffset}
        />
      }}
    </Show>
  });

  render(() => <Loader />, mapElement);
};
