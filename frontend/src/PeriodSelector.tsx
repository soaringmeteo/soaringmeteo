import * as L from 'leaflet';
import { createEffect, createMemo, createSignal, JSX } from 'solid-js';

import { forecastOffsets, periodsPerDay, showDate } from './data/ForecastMetadata';
import { useState } from './State';
import { closeButton, closeButtonSize, keyWidth, meteogramColumnWidth, periodSelectorHeight, surfaceOverMap } from './styles/Styles';

const marginLeft = keyWidth;
const marginTop = periodSelectorHeight;

const hover = (htmlEl: HTMLElement): HTMLElement => {
  let oldValue: string = 'inherit';
  htmlEl.onmouseenter = () => {
    oldValue = htmlEl.style.backgroundColor;
    htmlEl.style.backgroundColor = 'lightGray';
  }
  htmlEl.onmouseleave = () => htmlEl.style.backgroundColor = oldValue;
  return htmlEl
}

const PeriodSelector = (props: {
  forecastOffsetAndDates: Array<[number, Date]>
  detailedView: JSX.Element
}): HTMLElement => {

  const [state, { setHourOffset }] = useState();

  const flatPeriodSelectors: () => Array<[HTMLElement, number, Date]> =
    createMemo(() => {
      return props.forecastOffsetAndDates
        .map(([hourOffset, date]) => {
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
              onClick={() => setHourOffset(hourOffset)}
            >
              {date.toLocaleTimeString(undefined, { hour12: false, hour: '2-digit' })}
            </span>;
          hover(htmlEl);
          return [htmlEl, hourOffset, date]
        });
    })

  const periodSelectorsByDay: () => Array<[Array<[HTMLElement, number]>, Date]> = createMemo(() => {
    const result: Array<[Array<[HTMLElement, number]>, Date]> = [];
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

  const periodSelectors: () => Array<HTMLElement> =
    createMemo(() => {
      return periodSelectorsByDay().map(([periods, date]) => {
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
              onClick={() => setHourOffset(periods[1 /* because we have three periods per day in total in GFS */][1])}
            >
            {
              periods.length === periodsPerDay ?
                date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', weekday: 'short' }) :
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
      <div style={{ width: `${length() * meteogramColumnWidth + keyWidth}px` }}>
        <div>{periodSelectors}</div>
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
const detailedView = (): (() => { key: JSX.Element, view: JSX.Element }) => {

  const [state] = useState();

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
        import(/* webpackPrefetch: true */ './diagrams/Meteogram').then(module => {
          set(module.meteogram(locationForecasts));
        });
      }
      else /*if (viewType === 'sounding')*/ {
        const forecast = locationForecasts.atHourOffset(state.hourOffset);
        if (forecast === undefined) set(noDetailedView);
        else {
          import(/* webpackPrefetch: true */ './diagrams/Sounding').then(module => {
            set(module.sounding(forecast, locationForecasts.elevation, true));
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
  morningOffset: number,
}): JSX.Element => {

  const [state, { setHourOffset, hideLocationForecast }] = useState();

  const getDetailedView = detailedView();

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
          { showWeekDay: true }
        )
      }
    </div>;

  const previousDayBtn = hover(
    <div
      title='24 hours before'
      style={{ ...buttonStyle }}
      onClick={() => setHourOffset(Math.max(state.hourOffset - 24, 3))}
    >
      -24
    </div>
  );

  // FIXME jump to previous day afternoon if we are on the morning period
  const previousPeriodBtn = hover(
    <div
      title='Previous forecast period'
      style={{ ...buttonStyle }}
      onClick={() => setHourOffset(Math.max(state.hourOffset - 3, 3))}
    >
      -3
    </div>
  );

  // FIXME jump to next day morning if we are on the afternoon period
  const nextPeriodBtn = hover(
    <div
      title='Next forecast period'
      style={{ ...buttonStyle }}
      onClick={() => setHourOffset(Math.min(state.hourOffset + 3, state.forecastMetadata.latest))}
    >
      +3
    </div>
  );

  const nextDayBtn = hover(
    <div
      title='24 hours after'
      style={{ ...buttonStyle }}
      onClick={() => setHourOffset(Math.min(state.hourOffset + 24, state.forecastMetadata.latest))}
    >
      +24
    </div>
  );

  const periodSelectorEl =
    <PeriodSelector
      forecastOffsetAndDates={
        // If there is no selected forecast, infer the available periods from the forecast metadata
        (state.detailedView === undefined) ?
          forecastOffsets(state.forecastMetadata.init, props.morningOffset, state.forecastMetadata)
        :
          state.detailedView[0].offsetAndDates()
      }
      detailedView={ getDetailedView().view }
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
      onClick={() => hideLocationForecast() }
    >
      ⨯
    </div>;

  // Period selector and close button for the meteogram
  const periodSelectorContainer =
    <span style={{ position: 'absolute', top: 0, left: 0, 'z-index': 1100, 'max-width': '100%', 'user-select': 'none', cursor: 'default' }}>
      {detailedViewKeyEl}
      <div style={{ display: 'flex', 'align-items': 'flex-start' }}>
        {hideDetailedViewBtn}
        {periodSelectorEl}
      </div>
    </span>;
  L.DomEvent.disableClickPropagation(periodSelectorContainer);
  L.DomEvent.disableScrollPropagation(periodSelectorContainer);

  // Current period
  const currentDayContainer =
    <span style={{ position: 'absolute', bottom: 0, 'margin-left': 'auto', 'margin-right': 'auto', left: 0, right: 0, 'text-align': 'center', 'z-index': 950, 'user-select': 'none', cursor: 'default' }}>
      <div style={{ ...surfaceOverMap, width: '125px', display: 'inline-block', 'background-color': 'white', 'border-radius': '4px 4px 0 0' }}>
        {currentDayEl}
        <div>
          {previousDayBtn}
          {previousPeriodBtn}
          {nextPeriodBtn}
          {nextDayBtn}
        </div>
      </div>
    </span>;
  L.DomEvent.disableClickPropagation(currentDayContainer);
  L.DomEvent.disableScrollPropagation(currentDayContainer);

  return <>
    {periodSelectorContainer}
    {currentDayContainer}
  </>
};
