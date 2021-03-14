import { el, mount, setChildren, setStyle, unmount } from 'redom';
import { DetailedForecast, LocationForecasts } from './data/Forecast';
import * as L from 'leaflet';
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

    this.detailedViewEl = el('div'); // Filled later by showMeteogram
    this.marginLeft = keyWidth;
    const marginTop = 35; // Day height + hour height + 2 (wtf)
    this.detailedViewKeyEl = el('div', { style: { position: 'absolute', width: `${this.marginLeft}px`, left: 0, top: `${marginTop}px`, backgroundColor: 'white' } });

    const buttonStyle = { padding: '0.2em', display: 'inline-block', cursor: 'pointer', border: 'thin solid darkGray', boxSizing: 'border-box' };
    this.currentDayEl = el('div'); // Will be filled later by `updateSelectedForecast`

    const previousDayBtn = this.hover(el('div', { title: '24 hours before', style: { ...buttonStyle } }, '-24'));
    previousDayBtn.onclick = () => { forecastSelect.previousDay(); }

    const previousPeriodBtn = this.hover(el('div', { title: 'Previous forecast period', style: { ...buttonStyle } }, '-3'));
    previousPeriodBtn.onclick = () => { forecastSelect.previousPeriod(); }

    const nextPeriodBtn = this.hover(el('div', { title: 'Next forecast period', style: { ...buttonStyle } }, '+3'));
    nextPeriodBtn.onclick = () => { forecastSelect.nextPeriod(); }

    const nextDayBtn = this.hover(el('div', { title: '24 hours after', style: { ...buttonStyle } }, '+24'));
    nextDayBtn.onclick = () => { forecastSelect.nextDay(); }

    this.periodSelectorEl =
      this.periodSelectorElement(forecastOffsets(forecastInitDateTime, forecastSelect.morningOffset, this.forecastSelect.forecastMetadata));

    this.hideDetailedViewBtn =
      el(
        'div',
        {
          style: {
            ...buttonStyle,
            width: `${this.marginLeft}px`,
            flexShrink: 0,
            backgroundColor: 'white',
            visibility: 'hidden',
            textAlign: 'center'
          },
          title: 'Hide'
        },
        'X'
      );
    this.hideDetailedViewBtn.onclick = () => { forecastSelect.hideMeteogram(); };

    // Period selector and close button for the meteogram
    this.periodSelectorContainer =
      el(
        'span',
        { style: { position: 'absolute', top: 0, left: 0, zIndex: 1100, maxWidth: '100%', userSelect: 'none', cursor: 'default' } },
        this.detailedViewKeyEl,
        el(
          'div',
          { style: { display: 'flex', alignItems: 'flex-start' } },
          this.hideDetailedViewBtn,
          this.periodSelectorEl
        )
      );
    L.DomEvent.disableClickPropagation(this.periodSelectorContainer);
    L.DomEvent.disableScrollPropagation(this.periodSelectorContainer);
    this.updateSelectedForecast();

    mount(containerElement, this.periodSelectorContainer);

    // Current period
    this.currentDayContainer =
      el(
        'span',
        { style: { position: 'absolute', bottom: 0, marginLeft: 'auto', marginRight: 'auto', left: 0, right: 0, textAlign: 'center', zIndex: 950, userSelect: 'none', cursor: 'default' } },
        el(
          'div',
          { style: { width: '125px', display: 'inline-block', backgroundColor: 'white' } },
          this.currentDayEl,
          el('div', previousDayBtn, previousPeriodBtn, nextPeriodBtn, nextDayBtn)
        )
      );
    L.DomEvent.disableClickPropagation(this.currentDayContainer);
    L.DomEvent.disableScrollPropagation(this.currentDayContainer);
    mount(containerElement, this.currentDayContainer);
  }

  unmount(): void {
    unmount(this.containerElement, this.periodSelectorContainer);
    unmount(this.containerElement, this.currentDayContainer);
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
    setChildren(this.detailedViewKeyEl, []);
    setChildren(this.detailedViewEl, []);
    setStyle(this.hideDetailedViewBtn, { visibility: 'hidden' });
  }

  private showDetailedView(keyChildren: Array<HTMLElement>, mainChildren: Array<HTMLElement>, forecastOffsetAndDates: Array<[number, Date]>) {
    const updatedPeriodSelectorEl = this.periodSelectorElement(forecastOffsetAndDates);
    mount(this.periodSelectorEl.parentElement as HTMLElement, updatedPeriodSelectorEl, this.periodSelectorEl, /* replace = */ true);
    this.periodSelectorEl = updatedPeriodSelectorEl;
    setChildren(this.detailedViewKeyEl, keyChildren);
    setChildren(this.detailedViewEl, mainChildren);
    setStyle(this.hideDetailedViewBtn, { visibility: 'visible' });
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
          const htmlEl = el(
            'span',
            { style: { display: 'inline-block', cursor: 'pointer', border: 'thin solid darkGray', width: `${meteogramColumnWidth}px`, lineHeight: '20px', boxSizing: 'border-box', textAlign: 'center' } },
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
        return el(
          'div',
          { style: { display: 'inline-block' } },
          // Day
          el(
            'div',
            { style: { width: `${periods.length * meteogramColumnWidth}px`, textAlign: 'center', boxSizing: 'border-box', borderRight: 'thin solid darkGray', borderLeft: 'thin solid darkGray', lineHeight: '13px' } },
            periods.length === periodsPerDay ?
              date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', weekday: 'short' }) :
              '\xa0'
          ),
          // Periods in each day
          el('div', { style: { textAlign: 'right' } }, periods)
        )
      });

    const length = periodSelectorsByDay.reduce((n, ss) => n + ss[0].length, 0);
    const scrollablePeriodSelector =
      el(
        'div',
        { style: { overflowX: 'auto', backgroundColor: 'white' } },
        el(
          'div',
          { style: { width: `${length * meteogramColumnWidth + this.marginLeft}px` } },
          el('div', periodSelectors),
          this.detailedViewEl
        )
      );
    return scrollablePeriodSelector
  }

}
