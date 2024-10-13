import {Accessor, createEffect, createMemo, createSignal, JSX, Match, Show, Switch} from 'solid-js';

import {forecastOffsets, wrfForecastOffsets} from './data/ForecastMetadata';
import {showDate} from './shared';
import {type Domain} from './State';
import {
  buttonBorderSizePx,
  buttonStyle,
  keyWidth,
  meteogramColumnWidth,
  periodSelectorHeight,
  surfaceOverMap
} from './styles/Styles';
import { css } from "./css-hooks";
import {LocationDetails} from "./LocationDetails";
import {MapBrowserEvent} from "ol";
import {useI18n} from "./i18n";
import {gfsName, wrfName} from "./data/Model";

const marginLeft = keyWidth;
const marginTop = periodSelectorHeight;

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
              style={
                css({
                  display: 'inline-block',
                  cursor: 'pointer',
                  border: 'thin solid darkGray',
                  width: `${meteogramColumnWidth}px`,
                  'line-height': '20px',
                  'box-sizing': 'border-box',
                  'text-align': 'center',
                  'background-color': state.hourOffset === hourOffset ? 'lightGray' : 'unset',
                  'hover': {  'background-color': 'lightGray' }
                })
              }
              onClick={() => props.domain.setHourOffset(hourOffset)}
            >
              {
                date.toLocaleTimeString(
                  undefined,
                  { hour12: false, hour: '2-digit', timeZone: props.domain.timeZone() }
                )
              }
            </span>;
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
          <div
            style={
              css({
                cursor: 'pointer',
                width: `${periods.length * meteogramColumnWidth}px`,
                'text-align': 'center',
                'box-sizing': 'border-box',
                'border-right': 'thin solid darkGray',
                'border-left': 'thin solid darkGray',
                'line-height': '13px',
                'hover': { 'background-color': 'lightGray' }
              })
            }
            onClick={() => props.domain.setHourOffset(periods[Math.floor(maxPeriodsPerDay / 2)][1])}
          >
            {
              periods.length === maxPeriodsPerDay ?
                date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', weekday: 'short', timeZone: props.domain.timeZone() }) :
                '\xa0'
            }
          </div>;
        return <div
          style={{ ...surfaceOverMap, 'background-color': 'white', display: 'inline-block' }}
        >
          {dayEl}
          <div style={{ 'text-align': 'right' }}>{periods.map(tuple => tuple[0])}</div>
        </div>;
      });
    })

  const length = () => periodSelectorsByDay().reduce((n, ss) => n + ss[0].length, 0);
  const scrollablePeriodSelector =
    <div
      style={{
        'border-radius': '0 0 3px 0',
        'overflow-x': 'auto',
        'margin-left': `${marginLeft}px`,
        'user-select': 'none',
        cursor: 'default',
        'pointer-events': 'auto' // Disable 'pointer-events: none' from parent
    }}
    >
      <div style={{ 'min-width': `${length() * meteogramColumnWidth + keyWidth}px` }}>
        <div>{periodSelectors()}</div>
        {props.detailedView}
      </div>
    </div>;
  return scrollablePeriodSelector
}

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
    if (detailedView === undefined || detailedView.viewType === 'summary') {
      set(noDetailedView);
    } else {
      if (detailedView.viewType === 'meteogram') {
        import('./diagrams/Meteogram').then(module => {
          const { key, view } = module.meteogram(detailedView.locationForecasts, state);
          set({
            key,
            view: <div style={{ ...surfaceOverMap, 'background-color': 'white' }}>
              {view}
            </div>
          });
        });
      } else if (detailedView.viewType === 'sounding') {
        const forecast = detailedView.locationForecasts.atHourOffset(state.hourOffset);
        if (forecast === undefined) set(noDetailedView);
        else {
          import('./diagrams/Sounding').then(module => {
            set(module.sounding(forecast, detailedView.locationForecasts.elevation, true, state));
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
  locationClicks: Accessor<MapBrowserEvent<any> | undefined>
}): JSX.Element => {

  const { m } = useI18n();

  const state = props.domain.state;

  const getDetailedView = detailedView({ domain: props.domain });

  const detailedViewKeyEl = 
    <div style={{ position: 'absolute', width: `${marginLeft}px`, left: 0, top: `${marginTop}px`, 'background-color': 'white', 'pointer-events': 'auto' }}>
      { getDetailedView().key }
    </div>;

  const inlineButtonStyle = { ...buttonStyle, padding: '0.5em 0.5em', display: 'inline-block' };
  const daySelectorButttonStyle = (isSelected: boolean): JSX.CSSProperties => css({
    ...buttonStyle,
    'padding': '0.4em 0.4em',
    'margin-bottom': `-${buttonBorderSizePx}px`,
    'background-color': isSelected ? 'lightGray' : 'unset',
    hover: { 'background-color': 'lightGray' },
  });

  const [isDaySelectorVisible, makeDaySelectorVisible] = createSignal(false);
  const currentDayEl =
    <div>
      <Show when={ isDaySelectorVisible() }>
        <Switch>
          <Match when={ props.domain.state.model.name === gfsName }>
            {
              (() => {
                const run = props.domain.state.forecastMetadata;
                const selectedTimeStep = props.domain.state.hourOffset;
                const lastTimeStep = new Date(run.firstTimeStep);
                lastTimeStep.setUTCHours(lastTimeStep.getUTCHours() + run.latest);
                const numberOfPreviousDays =
                  Math.floor((run.firstTimeStep.getHours() + selectedTimeStep) / 24);
                const timeSteps: Array<number> =
                  Array.from({ length: numberOfPreviousDays })
                    .map((_, i) => selectedTimeStep - (numberOfPreviousDays - i) * 24);
                timeSteps.push(selectedTimeStep);
                const numberOfNextDays = (run.latest - selectedTimeStep + (23 - run.dateAtHourOffset(run.latest).getHours())) / 24;
                const nextTimeSteps =
                  Array.from({ length: numberOfNextDays })
                    .map((_, i) => selectedTimeStep + (i + 1) * 24);
                timeSteps.push(...nextTimeSteps);
                return timeSteps.map(timeStep => {
                  const date = props.domain.state.forecastMetadata.dateAtHourOffset(timeStep);
                  const isSelected = timeStep === selectedTimeStep;
                  return <div
                    style={ daySelectorButttonStyle(isSelected) }
                    onClick={ () => { props.domain.setHourOffset(timeStep); makeDaySelectorVisible(false); } }
                  >
                    { showDate(date, { showHour: false, showWeekDay: true, timeZone: props.domain.timeZone() }) }
                  </div>
                })
              })()
            }
          </Match>
          <Match when={ props.domain.state.model.name === wrfName }>
            {
              props.domain.wrfRuns.map(run => {
                const isSelected =
                  run.firstTimeStep.getTime() === props.domain.state.forecastMetadata.firstTimeStep.getTime();
                return <div
                  style={ daySelectorButttonStyle(isSelected) }
                  onClick={ () => { props.domain.setForecastMetadata(run, props.domain.state.hourOffset); makeDaySelectorVisible(false); } }
                >
                  { showDate(run.firstTimeStep, { showHour: false, showWeekDay: true, timeZone: props.domain.timeZone() }) }
                </div>
              })
            }
          </Match>
        </Switch>
      </Show>
      <div
        style={ daySelectorButttonStyle(false) }
        onClick={ () => makeDaySelectorVisible(!isDaySelectorVisible()) }
      >
        {
          showDate(
            state.forecastMetadata.dateAtHourOffset(state.hourOffset),
            { showWeekDay: true, timeZone: props.domain.timeZone() }
          )
        }
      </div>
    </div>;

  const previousDayBtn =
    <div
      title={ m().period24HoursBefore() }
      style={{ ...inlineButtonStyle }}
      onClick={ () => props.domain.previousDay() }
    >
      -24
    </div>;

  // FIXME jump to previous day afternoon if we are on the morning period
  const previousPeriodBtn =
    <div
      title={ m().periodPrevious() }
      style={{ ...inlineButtonStyle, 'margin-left': `-${buttonBorderSizePx}px` }}
      onClick={ () => props.domain.previousHourOffset() }
    >
      -{ props.domain.state.model.timeStep }
    </div>;

  // FIXME jump to next day morning if we are on the afternoon period
  const nextPeriodBtn =
    <div
      title={ m().periodNext() }
      style={{ ...inlineButtonStyle, 'margin-left': `-${buttonBorderSizePx}px` }}
      onClick={ () => props.domain.nextHourOffset() }
    >
      +{ props.domain.state.model.timeStep }
    </div>;

  const nextDayBtn =
    <div
      title={ m().period24HoursAfter() }
      style={{ ...inlineButtonStyle, 'margin-left': `-${buttonBorderSizePx}px` }}
      onClick={ () => props.domain.nextDay() }
    >
      +24
    </div>;

  const periodSelectorEl =
    <PeriodSelector
      forecastOffsetAndDates={
        // If there is no selected location, infer the available periods from the forecast metadata
        (state.detailedView === undefined || state.detailedView.viewType === 'summary') ?
          state.model.name === gfsName ? forecastOffsets(state.forecastMetadata.firstTimeStep, 9, state.forecastMetadata) : wrfForecastOffsets(state.forecastMetadata)
        :
          state.detailedView.locationForecasts.offsetAndDates()
      }
      detailedView={ getDetailedView().view }
      domain={ props.domain }
    />;

  // Period selector and close button for the meteogram
  // Note: we use 'pointer-events: none' to prevent the parent div from intercepting clicks on the map. As
  // a consequence, we have to reset 'pointer-events: auto' on every child element.
  const periodSelectorContainer =
    <div style={{ position: 'absolute', top: 0, left: 0, 'z-index': 100, 'max-width': '100%', 'font-size': '0.8125rem', 'pointer-events': 'none' }}>
      {periodSelectorEl}
      {detailedViewKeyEl}
      <LocationDetails locationClicks={props.locationClicks} domain={props.domain} /> {/* TODO Move out of PeriodSelector */}
    </div>;

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
        'border-radius': '3px 3px 0 0',
        'font-size': '0.8125rem',
        'text-align': 'center',
        'user-select': 'none',
        cursor: 'default',
        padding: '0'
      }}
    >
      {currentDayEl}
      <div>
        {previousDayBtn}
        {previousPeriodBtn}
        {nextPeriodBtn}
        {nextDayBtn}
      </div>
    </div>;

  return <>
    {periodSelectorContainer}
    {currentDayContainer}
  </>
};
