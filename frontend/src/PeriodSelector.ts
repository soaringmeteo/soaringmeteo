import * as L from 'leaflet';
import h from 'solid-js/h';
import { insert, style } from 'solid-js/web';

import { DetailedForecast, LocationForecasts } from './data/Forecast';
import { meteogram, keyWidth } from './diagrams/Meteogram';
import { ForecastMetadata, forecastOffsets, periodsPerDay } from './data/ForecastMetadata';
import { sounding } from './diagrams/Sounding';
import { meteogramColumnWidth } from './diagrams/Diagram';

export class PeriodSelector {

  /** Number of hours to add to 00:00Z to be on the morning forecast period (e.g., 9 for Switzerland) */
  readonly morningOffset: number
  /** Number of hours to add to 00:00Z to be on the beginning of the forecast (can be 0, 6, 12, or 18) */
  readonly forecastInitOffset: number

  /** Delta with the forecast initialization time */
  private hourOffset: number
  getHourOffset(): number { return this.hourOffset }

  private detailedView: 'sounding' | 'meteogram'
  getDetailedView(): 'sounding' | 'meteogram' { return this.detailedView }

  private readonly view: View

  constructor(
    readonly forecastMetadata: ForecastMetadata,
    containerElement: HTMLElement,
    readonly notify: {
      hourOffset: (ho: number) => void
    }
  ) {
    // TODO Compute based on user preferred time zone (currently hard-coded for central Europe)
    this.morningOffset = 9;
    const noonOffset   = 12;
    this.forecastInitOffset = +forecastMetadata.init.getUTCHours();
    // Tomorrow, noon period
    this.hourOffset = (this.forecastInitOffset === 0 ? 0 : 24) + noonOffset - this.forecastInitOffset;
    this.detailedView = 'meteogram';
    this.view = new View(this, forecastMetadata.init, containerElement);
  }

  updateHourOffset(value: number): void {
    // TODO Guards
    if (value !== this.hourOffset) {
      this.hourOffset = value;
      this.notify.hourOffset(this.hourOffset);
      this.view.updateSelectedForecast();
    }
  }
  nextDay(): void {
    this.updateHourOffset(Math.min(this.hourOffset + 24, this.forecastMetadata.latest));
  }
  nextPeriod(): void {
    // TODO jump to next day morning if we are on the afternoon period
    this.updateHourOffset(Math.min(this.hourOffset + 3, this.forecastMetadata.latest));
  }
  previousPeriod(): void {
    // TODO jump to previous day afternoon if we are on the morning period
    this.updateHourOffset(Math.max(this.hourOffset - 3, 3));
  }
  previousDay(): void {
    this.updateHourOffset(Math.max(this.hourOffset - 24, 3));
  }

  updateDetailedView(value: 'meteogram' | 'sounding'): void {
    this.detailedView = value;
    // TODO update view
  }

  showDetailedView(latitude: number, longitude: number): void {
    this.forecastMetadata
      .fetchLocationForecasts(latitude, longitude)
      .then(locationForecasts => {
        switch(this.detailedView) {
          case 'meteogram':
            this.showMeteogram(locationForecasts);
            break
          case 'sounding':
            this.showSounding(locationForecasts);
            break
        }
      })
  }

  showMeteogram(forecasts: LocationForecasts): void {
    const [leftKeyElement, meteogramElement, rightKeyElement] = meteogram(forecasts);
    const forecastOffsetAndDates: Array<[number, Date]> = forecasts.offsetAndDates();
    this.view.showMeteogram(leftKeyElement, meteogramElement, rightKeyElement, forecastOffsetAndDates);
  }

  hideMeteogram(): void {
    this.view.hideDetailedView();
  }

  showSounding(forecasts: LocationForecasts): void {
    const maybeDetailedForecast = forecasts.atHourOffset(this.hourOffset);
    if (maybeDetailedForecast === undefined) {
      console.error(`Unable to show sounding forecast for this period.`)
    } else {
      this.view.showSounding(maybeDetailedForecast, forecasts.elevation, forecasts.offsetAndDates());
    }
  }

  unmount(): void {
    this.view.unmount();
  }

}
class View {

  private periodSelectorContainer: HTMLElement;
  private currentDayContainer: HTMLElement;
  readonly currentDayEl: HTMLElement
  private periodSelectorEl: HTMLElement;
  private detailedViewEl: HTMLElement
  private detailedViewKeyEl: HTMLElement
  private hideDetailedViewBtn: HTMLElement;
  private readonly marginLeft: number;

  constructor(readonly forecastSelect: PeriodSelector, readonly forecastInitDateTime: Date, private readonly containerElement: HTMLElement) {

    this.detailedViewEl = h('div'); // Filled later by showMeteogram
    this.marginLeft = keyWidth;
    const marginTop = 35; // Day height + hour height + 2 (wtf)
    this.detailedViewKeyEl = h('div', { style: { position: 'absolute', width: `${this.marginLeft}px`, left: 0, top: `${marginTop}px`, 'background-color': 'white' } });

    const buttonStyle = { padding: '0.2em', display: 'inline-block', cursor: 'pointer', border: 'thin solid darkGray', 'box-sizing': 'border-box' };
    this.currentDayEl = h('div'); // Will be filled later by `updateSelectedForecast`

    const previousDayBtn = this.hover(h('div', { title: '24 hours before', style: { ...buttonStyle } }, '-24'));
    previousDayBtn.onclick = () => { forecastSelect.previousDay(); }

    const previousPeriodBtn = this.hover(h('div', { title: 'Previous forecast period', style: { ...buttonStyle } }, '-3'));
    previousPeriodBtn.onclick = () => { forecastSelect.previousPeriod(); }

    const nextPeriodBtn = this.hover(h('div', { title: 'Next forecast period', style: { ...buttonStyle } }, '+3'));
    nextPeriodBtn.onclick = () => { forecastSelect.nextPeriod(); }

    const nextDayBtn = this.hover(h('div', { title: '24 hours after', style: { ...buttonStyle } }, '+24'));
    nextDayBtn.onclick = () => { forecastSelect.nextDay(); }

    this.periodSelectorEl =
      this.periodSelectorElement(forecastOffsets(forecastInitDateTime, forecastSelect.morningOffset, this.forecastSelect.forecastMetadata));

    this.hideDetailedViewBtn =
      h(
        'div',
        {
          style: {
            ...buttonStyle,
            width: `${this.marginLeft}px`,
            'flex-shrink': 0,
            'background-color': 'white',
            visibility: 'hidden',
            'text-align': 'center'
          },
          title: 'Hide'
        },
        'X'
      );
    this.hideDetailedViewBtn.onclick = () => { forecastSelect.hideMeteogram(); };

    // Period selector and close button for the meteogram
    this.periodSelectorContainer =
      h(
        'span',
        { style: { position: 'absolute', top: 0, left: 0, 'z-index': 1100, 'max-width': '100%', 'user-select': 'none', cursor: 'default' } },
        this.detailedViewKeyEl,
        h(
          'div',
          { style: { display: 'flex', 'align-items': 'flex-start' } },
          this.hideDetailedViewBtn,
          this.periodSelectorEl
        )
      );
    L.DomEvent.disableClickPropagation(this.periodSelectorContainer);
    L.DomEvent.disableScrollPropagation(this.periodSelectorContainer);
    this.updateSelectedForecast();

    insert(containerElement, this.periodSelectorContainer);

    // Current period
    this.currentDayContainer =
      h(
        'span',
        { style: { position: 'absolute', bottom: 0, 'margin-left': 'auto', 'margin-right': 'auto', left: 0, right: 0, 'text-align': 'center', 'z-index': 950, 'user-select': 'none', cursor: 'default' } },
        h(
          'div',
          { style: { width: '125px', display: 'inline-block', 'background-color': 'white' } },
          this.currentDayEl,
          h('div', previousDayBtn, previousPeriodBtn, nextPeriodBtn, nextDayBtn)
        )
      );
    L.DomEvent.disableClickPropagation(this.currentDayContainer);
    L.DomEvent.disableScrollPropagation(this.currentDayContainer);
    insert(containerElement, this.currentDayContainer);
  }

  unmount(): void {
    this.containerElement.removeChild(this.periodSelectorContainer);
    this.containerElement.removeChild(this.currentDayContainer);
  }

  private hover(htmlEl: HTMLElement): HTMLElement {
    htmlEl.onmouseenter = () => htmlEl.style.backgroundColor = 'lightGray';
    htmlEl.onmouseleave = () => {
      htmlEl.style.backgroundColor = 'inherit';
      this.updateSelectedForecast();
    }
    return htmlEl
  }

  private hoursForPeriod(utcOffset: number): number {
    const date = new Date(this.forecastInitDateTime);
    date.setUTCHours(utcOffset);
    return date.getHours()
  }

  /** Update the view according to the selected forecast period */
  updateSelectedForecast(): void {
    const forecastDateTime = new Date(this.forecastInitDateTime);
    forecastDateTime.setUTCHours(this.forecastInitDateTime.getUTCHours() + this.forecastSelect.getHourOffset());
    this.currentDayEl.textContent = forecastDateTime.toLocaleString(undefined, { month: 'short', weekday: 'short', day: 'numeric', hour12: false, hour: 'numeric', minute: 'numeric' });
  }

  private periodStyle(periodOffset: number): object {
    if ((this.forecastSelect.getHourOffset() + this.forecastSelect.forecastInitOffset) % 24 === periodOffset) {
      return { backgroundColor: '#999' }
    } else {
      return { backgroundColor: 'inherit' }
    }
  }

  hideDetailedView(): void {
    let node: ChildNode | null;
    while (node = this.detailedViewKeyEl.firstChild, node !== null) {
      this.detailedViewKeyEl.removeChild(node);
    }
    while (node = this.detailedViewEl.firstChild, node !== null) {
      this.detailedViewEl.removeChild(node)
    }
    style(this.hideDetailedViewBtn, { visibility: 'hidden' });
  }

  private showDetailedView(keyChildren: Array<HTMLElement>, mainChildren: Array<HTMLElement>, forecastOffsetAndDates: Array<[number, Date]>) {
    const updatedPeriodSelectorEl = this.periodSelectorElement(forecastOffsetAndDates);
    (this.periodSelectorEl.parentElement as HTMLElement).replaceChild(updatedPeriodSelectorEl, this.periodSelectorEl);
    this.periodSelectorEl = updatedPeriodSelectorEl;
    let node: ChildNode | null;
    while (node = this.detailedViewKeyEl.firstChild, node !== null) {
      this.detailedViewKeyEl.removeChild(node);
    }
    while (node = this.detailedViewEl.firstChild, node !== null) {
      this.detailedViewEl.removeChild(node)
    }
    insert(this.detailedViewKeyEl, keyChildren);
    insert(this.detailedViewEl, mainChildren);
    style(this.hideDetailedViewBtn, { visibility: 'visible' });
  }

  showMeteogram(leftKey: HTMLElement, meteogram: HTMLElement, rightKey: HTMLElement, forecastOffsetAndDates: Array<[number, Date]>): void {
    this.showDetailedView(
      [leftKey],
      [meteogram, rightKey /* HACK Temporary... at some point we want to polish the layout... */],
      forecastOffsetAndDates
    );
  }

  showSounding(forecast: DetailedForecast, elevation: number, forecastOffsetAndDates: Array<[number, Date]>): void {
    const [leftKey, soundingEl] = sounding(forecast, elevation);
    this.showDetailedView(
      [leftKey],
      [soundingEl],
      forecastOffsetAndDates
    );
  }

  private periodSelectorElement(forecastOffsetAndDates: Array<[number, Date]>): HTMLElement {
    const flatPeriodSelectors: Array<[HTMLElement, Date]> = 
      forecastOffsetAndDates
        .map(([gfsOffset, date]) => {
          const htmlEl = h(
            'span',
            { style: { display: 'inline-block', cursor: 'pointer', border: 'thin solid darkGray', width: `${meteogramColumnWidth}px`, 'line-height': '20px', 'box-sizing': 'border-box', 'text-align': 'center' } },
            date.toLocaleTimeString(undefined, { hour12: false, hour: 'numeric' })
          );
          htmlEl.onclick = () => { this.forecastSelect.updateHourOffset(gfsOffset); };
          this.hover(htmlEl);
          return [htmlEl, date]
        });

    const periodSelectorsByDay: Array<[Array<HTMLElement>, Date]> = [];
    let lastDay: number | null = null;
    flatPeriodSelectors.forEach(([hourSelector, date]) => {
      if (date.getDay() === lastDay) {
        // Same group as previous
        periodSelectorsByDay[periodSelectorsByDay.length - 1][0].push(hourSelector);
      } else {
        // New group
        periodSelectorsByDay.push([[hourSelector], date]);
      }
      lastDay = date.getDay();
    });

    const periodSelectors =
      periodSelectorsByDay.map(([periods, date]) => {
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

    const length = periodSelectorsByDay.reduce((n, ss) => n + ss[0].length, 0);
    const scrollablePeriodSelector =
      h(
        'div',
        { style: { 'overflow-x': 'auto', 'background-color': 'white' } },
        h(
          'div',
          { style: { width: `${length * meteogramColumnWidth + this.marginLeft}px` } },
          h('div', periodSelectors),
          this.detailedViewEl
        )
      );
    return scrollablePeriodSelector
  }

}
