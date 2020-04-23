import { el, mount, setStyle } from 'redom';
import { App } from './App';
import { LatestForecast } from './Forecast';
import * as L from 'leaflet';

export class ForecastSelect {

  /** Number of hours to add to 00:00Z to be on the morning forecast period (e.g., 9 for Switzerland) */
  readonly morningOffset: number
  /** Number of hours to add to 00:00Z to be on the noon forecast period (e.g., 12 for Switzerland) */
  readonly noonOffset: number
  /** Number of hours to add to 00:00Z to be on the afternoon forecast period (e.g., 15 for Switzerland) */
  readonly afternoonOffset: number
  /** Number of hours to add to 00:00Z to be on the beginning of the forecast (can be 0, 6, 12, or 18) */
  readonly forecastInitOffset: number

  /** Delta with the forecast initialization time */
  private hourOffset: number
  getHourOffset() { return this.hourOffset }

  private view: ForecastSelectView

  constructor(private readonly app: App, latestForecast: LatestForecast, containerElement: HTMLElement) {
    // TODO Compute based on user preferred time zone (currently hard-coded for central Europe)
    this.morningOffset      = 9;
    this.noonOffset         = 12;
    this.afternoonOffset    = 15;
    this.forecastInitOffset = +latestForecast.time;
    // Tomorrow, noon period
    this.hourOffset = (latestForecast.time === '00' ? 0 : 24) + this.noonOffset - this.forecastInitOffset;
    const latestForecastDateTime = new Date(`${latestForecast.date}T${latestForecast.time}:00Z`);
    this.view = new ForecastSelectView(this, latestForecastDateTime, containerElement);
  }

  private updateHourOffset(value: number) {
    if (value !== this.hourOffset) {
      this.hourOffset = value;
      this.app.forecastLayer.updateForecast();
      this.view.updateSelectedForecast();
    }
  }
  selectMorning(): void {
    this.updateHourOffset(Math.floor((this.hourOffset + this.forecastInitOffset) / 24) * 24 + this.morningOffset - this.forecastInitOffset);
  }
  selectNoon(): void {
    this.updateHourOffset(Math.floor((this.hourOffset + this.forecastInitOffset) / 24) * 24 + this.noonOffset - this.forecastInitOffset);
  }
  selectAfternoon(): void {
    this.updateHourOffset(Math.floor((this.hourOffset + this.forecastInitOffset) / 24) * 24 + this.afternoonOffset - this.forecastInitOffset);
  }
  nextDay() {
    this.updateHourOffset(Math.min(this.hourOffset + 24, 186 /* TODO Store this setting somewhere */));
  }
  nextPeriod() {
    // TODO jump to next day morning if we are on the afternoon period
    this.updateHourOffset(Math.min(this.hourOffset + 3, 186));
  }
  previousPeriod() {
    // TODO jump to previous day afternoon if we are on the morning period
    this.updateHourOffset(Math.max(this.hourOffset - 3, 0));
  }
  previousDay() {
    this.updateHourOffset(Math.max(this.hourOffset - 24, 0));
  }
}

export class ForecastSelectView {

  readonly rootElement: HTMLElement
  readonly currentDayEl: HTMLElement
  readonly morningPeriodEl: HTMLElement
  readonly noonPeriodEl: HTMLElement
  readonly afternoonPeriodEl: HTMLElement

  constructor(readonly forecastSelect: ForecastSelect, readonly forecastInitDateTime: Date, containerElement: HTMLElement) {

    const hover = (htmlEl: HTMLElement): HTMLElement => {
      htmlEl.onmouseenter = () => htmlEl.style.backgroundColor = 'lightGray';
      htmlEl.onmouseleave = () => {
        htmlEl.style.backgroundColor = 'inherit';
        this.updateSelectedForecast();
      }
      return htmlEl
    }

    const buttonStyle = { padding: '0.3em', display: 'inline-block', cursor: 'pointer', border: 'thin solid darkGray' };
    this.currentDayEl = el('div', { style: { padding: '0.3em' } }); // Will be filled later by `updateSelectedForecast`

    this.morningPeriodEl = hover(
      el(
        'div',
        { style: { flexGrow: 1, ...buttonStyle } },
        `${this.hoursForPeriod(forecastSelect.morningOffset)}h`
      )
    );
    this.morningPeriodEl.onclick = () => { forecastSelect.selectMorning(); }

    this.noonPeriodEl = hover(
      el(
        'div',
        { style: { flexGrow: 1, ...buttonStyle } },
        `${this.hoursForPeriod(forecastSelect.noonOffset)}h`
      )
    );
    this.noonPeriodEl.onclick = () => { forecastSelect.selectNoon(); }

    this.afternoonPeriodEl = hover(
      el(
        'div',
        { style: { flexGrow: 1, ...buttonStyle } },
        `${this.hoursForPeriod(forecastSelect.afternoonOffset)}h`
      )
    );
    this.afternoonPeriodEl.onclick = () => { forecastSelect.selectAfternoon(); }

    const previousDayBtn = hover(el('div', { title: '24 hours before', style: { ...buttonStyle } }, '-24h'));
    previousDayBtn.onclick = () => { forecastSelect.previousDay(); }

    const previousPeriodBtn = hover(el('div', { title: 'Previous forecast period', style: { ...buttonStyle } }, '-3h'));
    previousPeriodBtn.onclick = () => { forecastSelect.previousPeriod(); }

    const nextPeriodBtn = hover(el('div', { title: 'Next forecast period', style: { ...buttonStyle } }, '+3h'));
    nextPeriodBtn.onclick = () => { forecastSelect.nextPeriod(); }

    const nextDayBtn = hover(el('div', { title: '24 hours after', style: { ...buttonStyle } }, '+24h'));
    nextDayBtn.onclick = () => { forecastSelect.nextDay(); }

    this.rootElement =
      el(
        'div',
        { style: { position: 'absolute', bottom: 0, zIndex: 1000, width: '100%', display: 'flex', justifyContent: 'center' } },
        el(
          'span',
          { style: { backgroundColor: 'whiteSmoke', userSelect: 'none', cursor: 'default' } },
          el(
            'span',
            { style: { display: 'inline-flex', flexDirection: 'column' } },
            el(
              'span',
              { style: { display: 'flex' } },
              this.morningPeriodEl, this.noonPeriodEl, this.afternoonPeriodEl
            ),
            this.currentDayEl
          ),
          el('span', previousDayBtn, previousPeriodBtn, nextPeriodBtn, nextDayBtn)
        )
      );
    L.DomEvent.disableClickPropagation(this.rootElement);
    L.DomEvent.disableScrollPropagation(this.rootElement);
    this.updateSelectedForecast();
    mount(containerElement, this.rootElement);
  }

  private hoursForPeriod(utcOffset: number): number {
    const date = new Date(this.forecastInitDateTime);
    date.setUTCHours(utcOffset);
    return date.getHours()
  }

  /** Update the view according to the selected forecast period */
  updateSelectedForecast() {
    const forecastDateTime = new Date(this.forecastInitDateTime);
    forecastDateTime.setUTCHours(this.forecastInitDateTime.getUTCHours() + this.forecastSelect.getHourOffset());
    this.currentDayEl.textContent = forecastDateTime.toLocaleString(undefined, { month: 'long', year: 'numeric', weekday: 'short', day: 'numeric', hour12: false, hour: 'numeric', minute: 'numeric' });
    setStyle(this.morningPeriodEl, this.periodStyle(this.forecastSelect.morningOffset));
    setStyle(this.noonPeriodEl, this.periodStyle(this.forecastSelect.noonOffset));
    setStyle(this.afternoonPeriodEl, this.periodStyle(this.forecastSelect.afternoonOffset));
  }

  private periodStyle(periodOffset: number): object {
    if ((this.forecastSelect.getHourOffset() + 24 - this.forecastSelect.forecastInitOffset) % 24 === periodOffset) {
      return { backgroundColor: '#999' }
    } else {
      return { backgroundColor: 'inherit' }
    }
  }

}
