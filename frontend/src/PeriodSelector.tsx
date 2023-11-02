import {createEffect, createMemo, createSignal, JSX, Show} from 'solid-js';

import { forecastOffsets } from './data/ForecastMetadata';
import {showCoordinates, showDate} from './shared';
import {DetailedViewType, type Domain, gfsModel} from './State';
import { closeButton, closeButtonSize, keyWidth, meteogramColumnWidth, periodSelectorHeight, surfaceOverMap } from './styles/Styles';
import { LocationForecasts } from './data/LocationForecasts';
import { Help } from './help/Help';

const marginLeft = keyWidth;
const marginTop = periodSelectorHeight;

const hover = (elm: JSX.Element): JSX.Element => {
  const htmlEl = elm as HTMLElement;
  let oldValue: string = 'inherit';
  htmlEl.onmouseenter = () => {
    oldValue = htmlEl.style.backgroundColor;
    htmlEl.style.backgroundColor = 'lightGray';
  }
  htmlEl.onmouseleave = () => htmlEl.style.backgroundColor = oldValue;
  return elm
}

const PeriodSelector = (props: {
  forecastOffsetAndDates: Array<[number, Date]>
  detailedView: JSX.Element
  domain: Domain
}): JSX.Element => {

  const state = props.domain.state;

  const flatPeriodSelectors: () => Array<[JSX.Element, number, Date]> =
    createMemo(() => {
      return props.forecastOffsetAndDates
        .map<[JSX.Element, number, Date]>(([hourOffset, date]) => {
          const htmlEl =
            <span
              style={{
                display: 'inline-block',
                cursor: 'pointer',
                border: 'thin solid darkGray',
                width: `${meteogramColumnWidth}px`,
                'line-height': '20px',
                'box-sizing': 'border-box',
                'text-align': 'center',
                'background-color': state.hourOffset === hourOffset ? 'lightGray' : 'inherit'
              }}
              onClick={() => props.domain.setHourOffset(hourOffset)}
            >
              {
                date.toLocaleTimeString(
                  undefined,
                  { hour12: false, hour: '2-digit', timeZone: props.domain.timeZone() }
                )
              }
            </span>;
          hover(htmlEl);
          return [htmlEl, hourOffset, date]
        });
    })

  const periodSelectorsByDay: () => Array<[Array<[JSX.Element, number]>, Date]> = createMemo(() => {
    const result: Array<[Array<[JSX.Element, number]>, Date]> = [];
    let lastDay: number | null = null;
    flatPeriodSelectors().forEach(([hourSelector, hourOffset, date]) => {
      if (date.getDay() === lastDay) {
        // Same group as previous
        result[result.length - 1][0].push([hourSelector, hourOffset]);
      } else {
        // New group
        result.push([[[hourSelector, hourOffset]], date]);
      }
      lastDay = date.getDay();
    });
    return result
  });

  const periodSelectors: () => Array<JSX.Element> =
    createMemo(() => {
      const periodSelectorsByDayValue = periodSelectorsByDay();

      const maxPeriodsPerDay =
        periodSelectorsByDayValue.reduce(
          (previousMax, [periodSelectors, date]) => {
            return Math.max(previousMax, periodSelectors.length)
          },
          0
        );

      return periodSelectorsByDayValue.map(([periods, date]) => {
        const dayEl =
          hover(
            <div
              style={{
                cursor: 'pointer',
                width: `${periods.length * meteogramColumnWidth}px`,
                'text-align': 'center',
                'box-sizing': 'border-box',
                'border-right': 'thin solid darkGray',
                'border-left': 'thin solid darkGray',
                'line-height': '13px'
              }}
              onClick={() => props.domain.setHourOffset(periods[Math.floor(maxPeriodsPerDay / 2)][1])}
            >
            {
              periods.length === maxPeriodsPerDay ?
                date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', weekday: 'short', timeZone: props.domain.timeZone() }) :
                '\xa0'
            }
            </div>
          );
        return <div style={{ display: 'inline-block' }}>
          {dayEl}
          <div style={{ 'text-align': 'right' }}>{periods.map(tuple => tuple[0])}</div>
        </div>;
      });
    })

  const length = () => periodSelectorsByDay().reduce((n, ss) => n + ss[0].length, 0);
  const scrollablePeriodSelector =
    <div style={{ 'overflow-x': 'auto', 'background-color': 'white' }}>
      <div style={{ 'min-width': `${length() * meteogramColumnWidth + keyWidth}px` }}>
        <div>{periodSelectors}</div>
        {props.detailedView}
      </div>
    </div>;
  return scrollablePeriodSelector
}

// Add location information below the detailed view, and additional buttons
const decorateDetailedView = (
  domain: Domain,
  viewType: DetailedViewType,
  forecasts: LocationForecasts,
  hourOffset: () => number,
  keyAndView: { key: JSX.Element, view: JSX.Element },
  showLocationForecast: (viewType: DetailedViewType) => void
): { key: JSX.Element, view: JSX.Element } => {
  const locationCoordinates = showCoordinates(forecasts.longitude, forecasts.latitude, domain.state.model);
  const extra =
    viewType === 'meteogram' ?
      <>
        <span style="font-size: 12px">
          Location: { locationCoordinates }. Model: { domain.modelName() }. Run: { showDate(domain.state.forecastMetadata.init, { showWeekDay: false, timeZone: domain.timeZone() }) }.
        </span>
        <button
          type="button"
          onClick={ () => showLocationForecast('sounding') }
          style="font-size: 12px"
        >
          Sounding for { showDate(domain.state.forecastMetadata.dateAtHourOffset(hourOffset()), { showWeekDay: true, timeZone: domain.timeZone() }) }
        </button>
      </> :
      <>
        <span style="font-size: 12px">
          Location: { locationCoordinates }. Time: { showDate(domain.state.forecastMetadata.dateAtHourOffset(hourOffset()), { showWeekDay: true, timeZone: domain.timeZone() }) }. Model: { domain.modelName() }. Run: { showDate(domain.state.forecastMetadata.init, { showWeekDay: false, timeZone: domain.timeZone() }) }.
        </span>
        <button
          type="button"
          onClick={ () => showLocationForecast('meteogram') }
          style="font-size: 12px"
        >
          Meteogram
        </button>
      </>;

  return {
    key: <>
      {keyAndView.key}
      <div style="height: 27px" /* help (24) + padding (3) */>&nbsp;</div>
    </>,
    view: <>
      { keyAndView.view }
      <div style="display: flex; gap: 1rem; align-items: baseline; padding-bottom: 3px">
        { extra }
        <Help domain={ domain } />
      </div>
    </>
  }
};

/**
 * Note: this function has to be invoked _after_ the state has been initialized and registered.
 * @returns A pair of a reactive element for the detailed view key, and a
 *          reactive element for the detailed view.
 */
const detailedView = (props: { domain: Domain }): (() => { key: JSX.Element, view: JSX.Element }) => {

  const state = props.domain.state;

  const noDetailedView: { key: JSX.Element, view: JSX.Element } = { key: <div />, view: <div /> };

  // dynamically generate new elements depending on state
  const [accessor, set] = createSignal(noDetailedView);

  createEffect(() => {
    const detailedView = state.detailedView;
    if (detailedView === undefined) {
      set(noDetailedView);
    } else {
      const [locationForecasts, viewType] = detailedView;
      if (viewType === 'meteogram') {
        import('./diagrams/Meteogram').then(module => {
          set(decorateDetailedView(
            props.domain,
            viewType,
            locationForecasts,
            () => state.hourOffset,
            module.meteogram(locationForecasts, state),
            viewType => props.domain.showLocationForecast(locationForecasts.latitude, locationForecasts.longitude, viewType)
          ));
        });
      }
      else /*if (viewType === 'sounding')*/ {
        const forecast = locationForecasts.atHourOffset(state.hourOffset);
        if (forecast === undefined) set(noDetailedView);
        else {
          import('./diagrams/Sounding').then(module => {
            set(decorateDetailedView(
              props.domain,
              viewType,
              locationForecasts,
              () => state.hourOffset,
              module.sounding(forecast, locationForecasts.elevation, true, state),
              viewType => props.domain.showLocationForecast(locationForecasts.latitude, locationForecasts.longitude, viewType)
            ));
          });
        }
      }
    }
  });

  return accessor
}

/**
 * @returns Both the period selector shown at the top of the window (which
 *          shows all the available days of forecast, and for each day, the
 *          available periods of forecast), and the one shown at the bottom
 *          of the screen (which shows the current date).
 */
export const PeriodSelectors = (props: {
  domain: Domain
}): JSX.Element => {

  const state = props.domain.state;

  const getDetailedView = detailedView({ domain: props.domain });

  const detailedViewKeyEl = 
    <div style={{ position: 'absolute', width: `${marginLeft}px`, left: 0, top: `${marginTop}px`, 'background-color': 'white' }}>
      { getDetailedView().key }
    </div>;

  const buttonStyle = { padding: '0.3em', display: 'inline-block', cursor: 'pointer', border: 'thin solid darkGray', 'box-sizing': 'border-box' };
  const currentDayEl =
    <div style={{ padding: '0.1em' }}>
      {
        showDate(
          state.forecastMetadata.dateAtHourOffset(state.hourOffset),
          { showWeekDay: true, timeZone: props.domain.timeZone() }
        )
      }
    </div>;

  const previousDayBtn = hover(
    <div
      title='24 hours before'
      style={{ ...buttonStyle }}
      onClick={ () => props.domain.previousDay() }
    >
      -24
    </div>
  );

  // FIXME jump to previous day afternoon if we are on the morning period
  const previousPeriodBtn = hover(
    <div
      title='Previous forecast period'
      style={{ ...buttonStyle }}
      onClick={ () => props.domain.previousHourOffset() }
    >
      -{ props.domain.timeStep() }
    </div>
  );

  // FIXME jump to next day morning if we are on the afternoon period
  const nextPeriodBtn = hover(
    <div
      title='Next forecast period'
      style={{ ...buttonStyle }}
      onClick={ () => props.domain.nextHourOffset() }
    >
      +{ props.domain.timeStep() }
    </div>
  );

  const nextDayBtn = hover(
    <div
      title='24 hours after'
      style={{ ...buttonStyle }}
      onClick={ () => props.domain.nextDay() }
    >
      +24
    </div>
  );

  const periodSelectorEl =
    <PeriodSelector
      forecastOffsetAndDates={
        // If there is no selected forecast, infer the available periods from the forecast metadata
        (state.detailedView === undefined) ?
          state.model === 'wrf' ? [] : forecastOffsets(state.forecastMetadata.firstTimeStep, 9, state.forecastMetadata)
        :
          state.detailedView[0].offsetAndDates()
      }
      detailedView={ getDetailedView().view }
      domain={ props.domain }
    />;

  const hideDetailedViewBtn =
    <div
      style={{
        ...closeButton,
        ...surfaceOverMap,
        'margin-right': `${marginLeft - closeButtonSize}px`,
        'flex-shrink': 0,
        visibility: (state.detailedView !== undefined) ? 'visible' : 'hidden'
      }}
      title='Hide'
      onClick={() => props.domain.hideLocationForecast() }
    >
      ⨯
    </div>;

  // Period selector and close button for the meteogram
  const periodSelectorContainer =
    <span style={{ position: 'absolute', top: 0, left: 0, 'z-index': 100, 'max-width': '100%', 'user-select': 'none', cursor: 'default', 'font-size': '0.8125rem' }}>
      {detailedViewKeyEl}
      <div style={{ display: 'flex', 'align-items': 'flex-start' }}>
        {hideDetailedViewBtn}
        {periodSelectorEl}
      </div>
    </span> as HTMLElement;

  // Current period
  const currentDayContainer =
    <div
      style={{
        ...surfaceOverMap,
        display: 'block',
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: 'translate(-50%,0)',
        'background-color': 'white',
        'border-radius': '2px 2px 0 0',
        'font-size': '0.8125rem',
        'text-align': 'center',
        'user-select': 'none',
        cursor: 'default',
        padding: '0.1rem 0.2rem 0 0.2rem'
      }}
    >
      {currentDayEl}
      <div>
        <Show when={ props.domain.state.model === gfsModel }>{previousDayBtn}</Show>
        {previousPeriodBtn}
        {nextPeriodBtn}
        <Show when={ props.domain.state.model === gfsModel }>{nextDayBtn}</Show>
      </div>
    </div> as HTMLElement;

  return <>
    {periodSelectorContainer}
    {currentDayContainer}
  </>
};
