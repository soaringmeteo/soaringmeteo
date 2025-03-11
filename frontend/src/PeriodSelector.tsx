import {createEffect, createMemo, createSignal, JSX} from 'solid-js';

import {forecastOffsets, wrfForecastOffsets} from './data/ForecastMetadata';
import {type Domain} from './State';
import {
  keyWidth,
  meteogramColumnWidth,
  periodSelectorHeight,
  surfaceOverMap
} from './styles/Styles';
import { css } from "./css-hooks";
import {gfsName} from "./data/Model";

const marginLeft = keyWidth;
const marginTop = periodSelectorHeight;

const PeriodSelector = (props: {
  forecastOffsetAndDates: Array<[number, Date]>
  meteogram: JSX.Element
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
                  on: $ => [$('hover', {  'background-color': 'lightGray' })]
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
                on: $ => [$('hover', { 'background-color': 'lightGray' })]
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
        'margin-left': `${marginLeft}px`,
        'user-select': 'none',
        cursor: 'default',
        'pointer-events': 'auto', // Disable 'pointer-events: none' from parent
        display: 'inline-block'
    }}
    >
      <div style={{ 'min-width': `${length() * meteogramColumnWidth + keyWidth}px` }}>
        <div>{periodSelectors()}</div>
        {props.meteogram}
      </div>
    </div>;
  return scrollablePeriodSelector
}

/**
 * Note: this function has to be invoked _after_ the state has been initialized and registered.
 * @returns A pair of a reactive element for the meteogram left axis, and a
 *          reactive element for the meteogram content.
 */
const meteogram = (props: { domain: Domain }): (() => { key: JSX.Element, view: JSX.Element }) => {

  const state = props.domain.state;

  const noDetailedView: { key: JSX.Element, view: JSX.Element } = { key: <div />, view: <div /> };

  // dynamically generate new elements depending on state
  const [accessor, set] = createSignal(noDetailedView);

  createEffect(() => {
    const detailedView = state.detailedView;
    if (detailedView === undefined || detailedView.viewType !== 'meteogram') {
      set(noDetailedView);
    } else {
      import('./diagrams/Meteogram').then(module => {
        const { key, view } = module.meteogram(detailedView.locationForecasts, state);
        set({
          key,
          view: <div style={{ ...surfaceOverMap, 'background-color': 'white' }}>
            {view}
          </div>
        });
      });
    }
  });

  return accessor
}

export const HourSelectorAndMeteogram = (props: {
  domain: Domain
}): JSX.Element => {
  const state = props.domain.state;

  const getMeteogram = meteogram({ domain: props.domain });

  // We use a separate element for the vertical axis of the meteogram to make it sticky
  // while the meteogram can be scrolled horizontally.
  const meteogramVerticalAxis =
    <div style={{ position: 'absolute', width: `${marginLeft}px`, left: 0, top: `${marginTop}px`, 'background-color': 'white', 'pointer-events': 'auto' }}>
      { getMeteogram().key }
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
      meteogram={ getMeteogram().view }
      domain={ props.domain }
    />;
  // Note: we use 'pointer-events: none' to prevent the parent div from intercepting clicks on the map. As
  // a consequence, we have to reset 'pointer-events: auto' on every child element.
  return <div style={{ 'max-width': '100%', 'overflow-x': 'auto', 'pointer-events': 'none' }}>
    {periodSelectorEl}
    {meteogramVerticalAxis}
  </div>;
};
