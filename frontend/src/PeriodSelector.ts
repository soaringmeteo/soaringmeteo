import * as L from 'leaflet';
import h from 'solid-js/h';
import { createMemo, JSX } from 'solid-js';

import { LocationForecasts } from './data/Forecast';
import { keyWidth, meteogram } from './diagrams/Meteogram';
import { ForecastMetadata, forecastOffsets, periodsPerDay } from './data/ForecastMetadata';
import { sounding } from './diagrams/Sounding';
import { meteogramColumnWidth } from './diagrams/Diagram';

const marginLeft = keyWidth;
const marginTop = 35; // Day height + hour height + 2 (wtf)

const hover = (htmlEl: HTMLElement): HTMLElement => {
  htmlEl.onmouseenter = () => htmlEl.style.backgroundColor = 'lightGray';
  htmlEl.onmouseleave = () => {
    htmlEl.style.backgroundColor = 'inherit';
    // this.updateSelectedForecast();
  }
  return htmlEl
}

const PeriodSelector = (props: {
  forecastOffsetAndDates: Array<[number, Date]>
  detailedView: JSX.Element
  onClick: (gfsOffset: number) => void
}): HTMLElement => {
  const flatPeriodSelectors: () => Array<[HTMLElement, Date]> =
    createMemo(() => {
      return props.forecastOffsetAndDates
        .map(([gfsOffset, date]) => {
          const htmlEl = h(
            'span',
            {
              style: { display: 'inline-block', cursor: 'pointer', border: 'thin solid darkGray', width: `${meteogramColumnWidth}px`, 'line-height': '20px', 'box-sizing': 'border-box', 'text-align': 'center' },
              onClick: () => props.onClick(gfsOffset)
            },
            date.toLocaleTimeString(undefined, { hour12: false, hour: 'numeric' })
          );
          hover(htmlEl);
          return [htmlEl, date]
        });
    })

  const periodSelectorsByDay: () => Array<[Array<HTMLElement>, Date]> = createMemo(() => {
    const result: Array<[Array<HTMLElement>, Date]> = [];
    let lastDay: number | null = null;
    flatPeriodSelectors().forEach(([hourSelector, date]) => {
      if (date.getDay() === lastDay) {
        // Same group as previous
        result[result.length - 1][0].push(hourSelector);
      } else {
        // New group
        result.push([[hourSelector], date]);
      }
      lastDay = date.getDay();
    });
    return result
  });

  const periodSelectors: () => Array<HTMLElement> =
    createMemo(() => {
      return periodSelectorsByDay().map(([periods, date]) => {
        return h(
          'div',
          { style: { display: 'inline-block' } },
          // Day
          h(
            'div',
            { style: { width: `${periods.length * meteogramColumnWidth}px`, 'text-align': 'center', 'box-sizing': 'border-box', 'border-right': 'thin solid darkGray', 'border-left': 'thin solid darkGray', 'line-height': '13px' } },
            periods.length === periodsPerDay ?
              date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', weekday: 'short' }) :
              '\xa0'
          ),
          // Periods in each day
          h('div', { style: { 'text-align': 'right' } }, periods)
        )
      });
    })

  const length = () => periodSelectorsByDay().reduce((n, ss) => n + ss[0].length, 0);
  const scrollablePeriodSelector =
    h(
      'div',
      { style: { 'overflow-x': 'auto', 'background-color': 'white' } },
      h(
        'div',
        { style: () => ({ width: `${length() * meteogramColumnWidth + keyWidth}px` }) },
        h('div', periodSelectors),
        h('div',
          () => props.detailedView // For some reason, dynamic nodes can’t have siblings, hence the empty div wrapper.
        )
      )
    );
  return scrollablePeriodSelector
}

/**
 * @returns A pair of a reactive element for the detailed view key, and a
 *          reactive element for the detailed view.
 */
const DetailedView = (props: {
  detailedView: 'meteogram' | 'sounding'
  locationForecasts: undefined | LocationForecasts
  hourOffset: number
}): [() => JSX.Element, () => JSX.Element] => {

  const fallback: [JSX.Element, JSX.Element] = [h('div'), h('div')];

  const keyAndView: () => [JSX.Element, JSX.Element] = createMemo<[JSX.Element, JSX.Element]>(() => {
    const locationForecasts = props.locationForecasts;
    if (locationForecasts === undefined) return fallback
    else if (props.detailedView === 'meteogram') {
      return meteogram(locationForecasts)
    }
    else /*if (props.detailedView === 'sounding')*/ {
      const forecast = locationForecasts.atHourOffset(props.hourOffset);
      if (forecast === undefined) return fallback
      else return sounding(forecast, locationForecasts.elevation)
    }
  });
  return [
    () => keyAndView()[0],
    () => keyAndView()[1]
  ]
}

/**
 * @returns Both the period selector shown at the top of the window (which
 *          shows all the available days of forecast, and for each day, the
 *          available periods of forecast), and the one shown at the bottom
 *          of the screen (which shows the current date).
 */
export const PeriodSelectors = (props: {
  forecastMetadata: ForecastMetadata,
  detailedView: 'meteogram' | 'sounding'
  locationForecasts: undefined | LocationForecasts,
  hourOffset: number,
  morningOffset: number,
  onHourOffsetChanged: (hourOffset: number) => void,
  onDetailedViewClosed: () => void
}): JSX.Element => {

  const [reactiveKey, reactiveDetailedView] = h(DetailedView, {
    detailedView: () => props.detailedView,
    locationForecasts: () => props.locationForecasts,
    hourOffset: () => props.hourOffset
  });

  const detailedViewKeyEl = 
    h(
      'div', { 
        style: { position: 'absolute', width: `${marginLeft}px`, left: 0, top: `${marginTop}px`, 'background-color': 'white' } 
      },
      reactiveKey
    );

  const buttonStyle = { padding: '0.2em', display: 'inline-block', cursor: 'pointer', border: 'thin solid darkGray', 'box-sizing': 'border-box' };
  const currentDayEl = h(
    'div',
    () => {
      const forecastDateTime = new Date(props.forecastMetadata.init);
      forecastDateTime.setUTCHours(props.forecastMetadata.init.getUTCHours() + props.hourOffset);
      return forecastDateTime.toLocaleString(undefined, { month: 'short', weekday: 'short', day: 'numeric', hour12: false, hour: 'numeric', minute: 'numeric' });
    }
  );

  const previousDayBtn = hover(h(
    'div',
    {
      title: '24 hours before',
      style: { ...buttonStyle },
      onClick: () => props.onHourOffsetChanged(Math.max(props.hourOffset - 24, 3))
    },
    '-24'
  ));

  // FIXME jump to previous day afternoon if we are on the morning period
  const previousPeriodBtn = hover(h(
    'div',
    {
      title: 'Previous forecast period',
      style: { ...buttonStyle },
      onClick: () => props.onHourOffsetChanged(Math.max(props.hourOffset - 3, 3))
    },
    '-3'
  ));

  // FIXME jump to next day morning if we are on the afternoon period
  const nextPeriodBtn = hover(h(
    'div', {
      title: 'Next forecast period', 
      style: { ...buttonStyle },
      onClick: () => props.onHourOffsetChanged(Math.min(props.hourOffset + 3, props.forecastMetadata.latest))
    },
    '+3'
  ));

  const nextDayBtn = hover(h(
    'div',
    {
      title: '24 hours after',
      style: { ...buttonStyle },
      onClick: () => props.onHourOffsetChanged(Math.min(props.hourOffset + 24, props.forecastMetadata.latest))
    },
    '+24'
  ));

  const periodSelectorEl =
    h(
      PeriodSelector,
      {
        forecastOffsetAndDates: () => {
          // If there is no selected forecast, infer the available periods from the forecast metadata
          if (props.locationForecasts === undefined)
            return forecastOffsets(props.forecastMetadata.init, props.morningOffset, props.forecastMetadata)
          else
            return props.locationForecasts.offsetAndDates()
        },
        detailedView: reactiveDetailedView,
        onClick: (hourOffset: number) => props.onHourOffsetChanged(hourOffset)
      }
    );

  const hideDetailedViewBtn =
    h(
      'div',
      {
        style: () => ({
          ...buttonStyle,
          width: `${marginLeft}px`,
          'flex-shrink': 0,
          'background-color': 'white',
          visibility: (props.locationForecasts !== undefined) ? 'visible' : 'hidden',
          'text-align': 'center'
        }),
        title: 'Hide',
        onClick: () => props.onDetailedViewClosed()
      },
      'X'
    );

  // Period selector and close button for the meteogram
  const periodSelectorContainer =
    h(
      'span',
      { style: { position: 'absolute', top: 0, left: 0, 'z-index': 1100, 'max-width': '100%', 'user-select': 'none', cursor: 'default' } },
      detailedViewKeyEl,
      h(
        'div',
        { style: { display: 'flex', 'align-items': 'flex-start' } },
        hideDetailedViewBtn,
        periodSelectorEl
      )
    );
  L.DomEvent.disableClickPropagation(periodSelectorContainer);
  L.DomEvent.disableScrollPropagation(periodSelectorContainer);

  // Current period
  const currentDayContainer =
    h(
      'span',
      { style: { position: 'absolute', bottom: 0, 'margin-left': 'auto', 'margin-right': 'auto', left: 0, right: 0, 'text-align': 'center', 'z-index': 950, 'user-select': 'none', cursor: 'default' } },
      h(
        'div',
        { style: { width: '125px', display: 'inline-block', 'background-color': 'white' } },
        currentDayEl,
        h('div', previousDayBtn, previousPeriodBtn, nextPeriodBtn, nextDayBtn)
      )
    );
  L.DomEvent.disableClickPropagation(currentDayContainer);
  L.DomEvent.disableScrollPropagation(currentDayContainer);

  return [
    periodSelectorContainer,
    currentDayContainer
  ]
};
