import { createStore, SetStoreFunction } from 'solid-js/store';
import { ForecastMetadata } from './data/ForecastMetadata';
import { Layer, ReactiveComponents } from './layers/Layer';
import { xcFlyingPotentialLayer } from './layers/ThQ';
import { layerByKey } from './layers/Layers';
import { boundaryLayerWindLayer } from './layers/Wind';
import {Accessor, batch, createMemo, mergeProps, splitProps} from 'solid-js';
import {DetailedView, DetailedViewType} from "./DetailedView";
import {Plausible} from "./Plausible";
import { gfsName, Model, ModelName, wrfName, Zone } from "./data/Model";

export type State = {
  // Currently selected numerical weather prediction model (GFS, WRF2, or WRF6)
  model: Model
  // Currently selected forecast run
  forecastMetadata: ForecastMetadata
  // Currently selected zone. Must be included in `forecastMetadata.zones`
  selectedZone: Zone
  // Delta with the forecast initialization time
  hourOffset: number
  // Selected layer on the map (XC flying potential, thermal velocity, etc.)
  primaryLayer: Layer
  primaryLayerEnabled: boolean
  // It is possible to also show a wind layer as an overlay
  windLayer: Layer
  windLayerEnabled: boolean
  // If defined, the detailed forecast data for the selected location, and the type of detailed view to display
  detailedView: undefined | DetailedView
  // --- Settings
  // Whether to show numerical values instead of showing a barb
  windNumericValuesShown: boolean
  // Whether to show UTC time instead of using the user timezone
  utcTimeShown: boolean
}

// Keys used to store the current display settings in the local storage
const selectedPrimaryLayerKey   = 'selected-primary-layer';
const selectedWindLayerKey      = 'selected-wind-layer';
const modelKey = 'model';
const zoneKey = (name: ModelName): string => `zone-${name}`;
const primaryLayerEnabledKey = 'primary-layer-enabled';
const windLayerEnabledKey       = 'wind-layer-enabled';
const windNumericValuesShownKey = 'wind-numeric-values-shown';
const utcTimeShownKey           = 'utc-time-shown';

const loadStoredState = <A,>(key: string, parse: (raw: string) => A, defaultValue: A): A => {
  const maybeItem = window.localStorage.getItem(key);
  if (maybeItem === null) {
    return defaultValue
  } else {
    return parse(maybeItem);
  }
};

const loadLayer = (key: string, fallback: Layer): Layer =>
  loadStoredState(key, layerKey => layerByKey(layerKey) || fallback, fallback);

const loadPrimaryLayer = (): Layer => 
  loadLayer(
    selectedPrimaryLayerKey,
    xcFlyingPotentialLayer
  );

const savePrimaryLayer = (key: string): void => {
  window.localStorage.setItem(selectedPrimaryLayerKey, key);
};

const loadPrimaryLayerEnabled = (): boolean =>
  loadStoredState(primaryLayerEnabledKey, raw => JSON.parse(raw), true);

const savePrimaryLayerEnabled = (value: boolean): void => {
  window.localStorage.setItem(primaryLayerEnabledKey, JSON.stringify(value));
};

const loadWindLayer = (): Layer => 
  loadLayer(
    selectedWindLayerKey,
    boundaryLayerWindLayer
  );

const saveWindLayer = (key: string): void => {
  window.localStorage.setItem(selectedWindLayerKey, key);
};

const loadModelName = (): ModelName => {
  // First, try to read from the URL parameters
  const params = new URLSearchParams(window.location.search);
  const model = params.get('model');
  if (model === gfsName || model === wrfName) {
    return model
  }
  // Second, read from local storage
  return loadStoredState(
    modelKey,
    value => value === wrfName ? wrfName : gfsName,
    gfsName
  );
};

const saveModelName = (name: ModelName) => {
  const url = new URL(window.location.toString());
  url.searchParams.set('model', name);
  window.history.replaceState(null, '', url);
  window.localStorage.setItem(modelKey, name);
}

const loadZone = (modelName: ModelName, zones: Array<Zone>): Zone => {
  // Try to read from the query parameters
  const params = new URLSearchParams(window.location.search);
  const value = params.get('zone');
  if (value !== null) {
    const zone = zones.find(zone => zone.id === value);
    if (zone !== undefined) {
      return zone
    }
  }
  // Read from local storage, and fallback to the first one otherwise
  return loadStoredState(
    zoneKey(modelName),
    value => zones.find(zone => zone.id === value) || zones.find(zone => zone.id === 'europe') || zones[0],
    zones.find(zone => zone.id === 'europe') || zones[0]
  );
};

const saveZone = (modelName: ModelName, key: string): void => {
  const url = new URL(window.location.toString());
  url.searchParams.set('zone', key);
  window.history.replaceState(null, '', url);
  window.localStorage.setItem(zoneKey(modelName), key);
};

const loadWindLayerEnabled = (): boolean =>
  loadStoredState(windLayerEnabledKey, raw => JSON.parse(raw), true);

const saveWindLayerEnabled = (value: boolean): void => {
  window.localStorage.setItem(windLayerEnabledKey, JSON.stringify(value));
};

const loadWindNumericValuesShown = (): boolean =>
  loadStoredState(windNumericValuesShownKey, raw => JSON.parse(raw), true);

const saveWindNumericValuesShown = (value: boolean): void => {
  window.localStorage.setItem(windNumericValuesShownKey, JSON.stringify(value));
};

const loadUtcTimeShown = (): boolean =>
  loadStoredState(utcTimeShownKey, raw => JSON.parse(raw), false);

const saveUtcTimeShown = (value: boolean): void => {
  window.localStorage.setItem(utcTimeShownKey, JSON.stringify(value));
};

/**
 * Manages the interactions with the state of the system.
 * 
 * The state of the system can be read via the `state` property.
 * To update the state, use the methods defined here.
 */
export class Domain {

  readonly state: State;
  private readonly setState: SetStoreFunction<State>;
  private readonly plausible: Plausible;
  private readonly gfsModel: Model;
  private readonly wrfModel: Model;

  // Since those reactive components depend on the state, we can not make them part of the state
  readonly primaryLayerReactiveComponents: Accessor<ReactiveComponents>;
  readonly windLayerReactiveComponents: Accessor<ReactiveComponents>;

  constructor (
    readonly gfsRuns: Array<ForecastMetadata>,
    gfsZones: Array<Zone>,
    readonly wrfRuns: Array<ForecastMetadata>,
    wrfZones: Array<Zone>
  ) {
    this.plausible = new Plausible();
    this.gfsModel = {
      name: gfsName,
      zones: gfsZones,
      timeStep: 3
    };
    this.wrfModel = {
      name: wrfName,
      zones: wrfZones,
      timeStep: 1
    };
    const modelName = loadModelName();
    const forecastMetadata = selectRun(modelName, gfsRuns, wrfRuns);
    const selectedZone = loadZone(modelName, forecastMetadata.availableZones);
    const primaryLayer = loadPrimaryLayer();
    const primaryLayerEnabled = loadPrimaryLayerEnabled();
    const windLayer = loadWindLayer();
    const windLayerEnabled = loadWindLayerEnabled();
    const windNumericValuesShown = loadWindNumericValuesShown();
    const utcTimeShown = loadUtcTimeShown();
  
    // FIXME handle map location and zoom here? (currently handled in /map/Map.ts)
    const [get, set] = createStore<State>({
      model: modelName === wrfName ? this.wrfModel : this.gfsModel,
      forecastMetadata: forecastMetadata,
      selectedZone,
      primaryLayer: primaryLayer,
      primaryLayerEnabled,
      windLayer: windLayer,
      windLayerEnabled,
      hourOffset: forecastMetadata.defaultHourOffset(),
      detailedView: undefined,
      windNumericValuesShown,
      utcTimeShown
    }, { name: 'state' }); // See https://github.com/solidjs/solid/discussions/1414

    this.state = get;
    this.setState = set;
    const self = this;

    const [projectedProps] =
      splitProps(this.state, ['forecastMetadata', 'hourOffset', 'windNumericValuesShown']);
    const props =
      mergeProps(projectedProps, {
        setHourOffset: (value: number) => this.setHourOffset(value),
        get timeZone(): string | undefined { return self.timeZone() },
        get zone(): Zone { return self.effectiveZone() }
      });

    this.primaryLayerReactiveComponents =
      createMemo(() => this.state.primaryLayer.reactiveComponents(props));
    this.windLayerReactiveComponents =
      createMemo(() => this.state.windLayer.reactiveComponents(props));

    // Fire a page view event for the initial page view
    this.plausible.trackPageView(modelName);
  }

  /** Set the model (GFS, WRF) to display */
  setModel(modelName: ModelName): void {
    const run = selectRun(modelName, this.gfsRuns, this.wrfRuns);
    const selectedZone = loadZone(modelName, run.availableZones);
    saveModelName(modelName);
    this.plausible.trackPageView(modelName);
    saveZone(modelName, selectedZone.id);
    batch(() => {
      this.setState({ model: modelName === wrfName ? this.wrfModel : this.gfsModel, selectedZone });
      this.setForecastMetadata(run);
    });
  }

  /** The grid resolution of the model / zone effectively displayed */
  effectiveResolution(): number {
    if (this.state.model.name === gfsName) {
      return 25
    } else {
      return this.effectiveZone().id === 'alps-overview' ? 6 : 2
    }
  }

  /** Set the forecast run to display */
  setForecastMetadata(forecastMetadata: ForecastMetadata, hourOffset?: number): void {
    const maybePreviousDetailedView =
      this.state.model.name === wrfName && forecastMetadata.modelPath === 'wrf' ? this.state.detailedView : undefined;
    this.setState({
      forecastMetadata,
      hourOffset: hourOffset !== undefined ? hourOffset : forecastMetadata.defaultHourOffset(),
      detailedView: undefined
    });
    // In case we switched to another WRF run and there was already a detailed view that was open,
    // refresh it.
    if (maybePreviousDetailedView !== undefined) {
      const detailedView = maybePreviousDetailedView;
      this.showLocationForecast(detailedView.latitude, detailedView.longitude, detailedView.viewType);
    }
  }

  /** Set the zone (Europe, America, etc.) to cover */
  setZone(selectedZone: Zone): void {
    saveZone(this.state.model.name, selectedZone.id);
    this.setState({
      selectedZone,
      detailedView: undefined
    });
  }

  /** Change the period to display in the current forecast run */
  setHourOffset(hourOffset: number): void {
    this.setState({
      hourOffset: Math.max(Math.min(hourOffset, this.state.forecastMetadata.latest), this.state.model.name === gfsName ? 3 : 0)
    });
  }

  nextHourOffset(): void {
    this.setHourOffset(this.state.hourOffset + this.state.model.timeStep);
  }

  previousHourOffset(): void {
    this.setHourOffset(this.state.hourOffset - this.state.model.timeStep);
  }

  nextDay(): void {
    if (this.state.model.name === gfsName) {
      this.setHourOffset(this.state.hourOffset + 24);
    } else if (this.state.model.name === wrfName) {
      const maybeNextForecast =
        this.wrfRuns.find(run =>
          run.firstTimeStep > this.state.forecastMetadata.firstTimeStep
        );
      if (maybeNextForecast !== undefined) {
        this.setForecastMetadata(maybeNextForecast, this.state.hourOffset);
      }
    }
  }

  previousDay(): void {
    if (this.state.model.name === gfsName) {
      this.setHourOffset(this.state.hourOffset - 24);
    } else if (this.state.model.name === wrfName) {
      const runs = this.wrfRuns.concat([]).reverse();
      const i =
        runs.findIndex(run =>
          run.firstTimeStep < this.state.forecastMetadata.firstTimeStep
        );
      if (i >= 0) {
        this.setForecastMetadata(runs[i], this.state.hourOffset);
      }
    }
  }

  /** Change which primary layer to show. Valid keys are defined above in the file */
  setPrimaryLayer(layer: Layer): void {
    savePrimaryLayer(layer.key);
    savePrimaryLayerEnabled(true);
    this.setState({ primaryLayer: layer, primaryLayerEnabled: true });
  }

  enablePrimaryLayer(enabled: boolean): void {
    savePrimaryLayerEnabled(enabled);
    this.setState({ primaryLayerEnabled: enabled });
  }

  /** Change which wind layer to show. Valid keys are defined above in the file */
  setWindLayer(layer: Layer): void {
    saveWindLayer(layer.key);
    saveWindLayerEnabled(true);
    this.setState({ windLayer: layer, windLayerEnabled: true });
  }

  /** Whether the wind layer should be shown. */
  enableWindLayer(enabled: boolean): void {
    saveWindLayerEnabled(enabled);
    this.setState({ windLayerEnabled: enabled });
  }

  /** Whether numerical values should be displayed instead of wind barbs */
  showWindNumericValues(windNumericValuesShown: boolean): void {
    saveWindNumericValuesShown(windNumericValuesShown);
    this.setState({ windNumericValuesShown })
  }

  /** Whether to show UTC time instead of using the user timezone */
  showUtcTime(utcTimeShown: boolean): void {
    saveUtcTimeShown(utcTimeShown);
    this.setState({ utcTimeShown });
  }

  /** The timezone to use according to the user’s preferences */
  timeZone(): string | undefined {
    return this.state.utcTimeShown ? 'UTC' : undefined
  }

  /** Display the detailed view (meteogram or sounding) at the given location */
  showLocationForecast(latitude: number, longitude: number, viewType: DetailedViewType): void {
    if (viewType === 'summary') {
      this.setState({
        detailedView: { viewType, latitude, longitude }
      })
    } else {
      this.state.forecastMetadata
        .fetchLocationForecasts(this.effectiveZone(), latitude, longitude)
        .then(locationForecasts => {
          if (locationForecasts !== undefined) {
            this.setState({
              detailedView: { viewType, locationForecasts, latitude, longitude }
            });
          }
        });
    }
  }

  /** Hide the detailed view */
  hideLocationForecast(): void {
    this.setState({ detailedView: undefined })
  }

  /**
   * Zone effectively displayed on the map.
   *
   * It can be different from the selected zone, for instance if we display a WRF run in 4 days
   * we always fall back to the 6-km resolution zone even if a 2-km resolution zone was selected.
   */
  readonly effectiveZone: Accessor<Zone> = () => {
    // In case of WRF, fallback to the Alps Overview when the selected forecast run does
    // not contain the 2-km resolution zones.
    if (this.state.model.name === wrfName && !this.state.forecastMetadata.availableZones.some(zone => zone.id === this.state.selectedZone.id)) {
      return this.state.forecastMetadata.availableZones[0] // Currently, WRF6 runs contain only one zone
    } else {
      return this.state.selectedZone
    }
  };

  readonly urlOfRasterAtCurrentHourOffset: Accessor<string> =
    (): string => this.state.forecastMetadata.urlOfRasterAtHourOffset(
        this.effectiveZone().id,
        this.state.primaryLayer.dataPath,
        this.state.hourOffset
      );

  readonly urlOfVectorTilesAtCurrentHourOffset: Accessor<string> =
    (): string =>
      this.state.forecastMetadata.urlOfVectorTilesAtHourOffset(
        this.effectiveZone().id,
        this.state.windLayer.dataPath,
        this.state.hourOffset
      );

}

/**
 * Find the earliest run whose first time step is less than 8 hours before the current time.
 * If the users open Soaringmeteo in the morning, they should get the forecast for the current day,
 * but if they open it in the evening, they should get the forecast for the next day.
 */
const selectWrfRun = (runs: Array<ForecastMetadata>): ForecastMetadata => {
  const now = new Date().getTime();
  const heightHours = 8 * 60 * 60 * 1000;
  const i =
    runs.findIndex(run =>
      now - run.firstTimeStep.getTime() < heightHours
    )
  if (i >= 0) {
    return runs[i]
  } else {
    return runs[runs.length - 1]
  }
};

/** Select the default forecast run to display */
const selectRun = (name: ModelName, gfsRuns: Array<ForecastMetadata>, wrfRuns: Array<ForecastMetadata>): ForecastMetadata => {
  if (name === gfsName) return gfsRuns[gfsRuns.length - 1]
  else return selectWrfRun(wrfRuns)
}
