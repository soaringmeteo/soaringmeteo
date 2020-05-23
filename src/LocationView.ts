import { el } from 'redom';
import { DetailedForecastData, LatestForecast } from './Forecast';

const periodsPerDay = 3 // TODO Make it a global setting

export const locationView = (gfsRun: LatestForecast, forecasts: Array<DetailedForecastData>, firstPeriodOffset: number): HTMLElement => {
  const gfsRunDateTime = new Date(`${gfsRun.date}T${gfsRun.time}:00Z`);
  // Keep only `periodsPerDay` forecasts (e.g. we don’t show show the forecasts for the night)
  const relevantForecastOffsets = Array.from({ length: periodsPerDay }, (_, i) => firstPeriodOffset + i * 3);
  const relevantForecasts =
    forecasts
      .map<[DetailedForecastData, number]>((forecast, i) => [forecast, gfsRunDateTime.getUTCHours() + (i + 1) * 3])
      .filter(([_, hourOffset]) => relevantForecastOffsets.includes(hourOffset % 24))
      .map<[DetailedForecastData, Date]>(([forecast, hourOffset]) => {
        const date = new Date(gfsRunDateTime);
        date.setUTCHours(hourOffset);
        return [forecast, date]
      });

  return el(
    'div',
    { style: { position: 'relative' } },
    el(
      'div',
      { style: { marginLeft: '8.5rem', overflowX: 'scroll', overflowY: 'visible' } },
      el(
        'table',
        { style: { borderSpacing: 0 } },
        thead(relevantForecasts.map(([_, date]) => date)),
        tbody(relevantForecasts.map(([forecast, _]) => forecast))
      )
    )
  )
}

const stickyStyle = { position: 'absolute', left: 0, top: 'auto', width: '8rem', whiteSpace: 'nowrap', textAlign: 'right', padding: '.2rem .3rem', borderRight: 'solid thin gray' };

const thead = (forecastDates: Array<Date>): HTMLElement => {

  // Compute days of forecast and the number of forecasts in each day
  const [lastDay, days] =
    forecastDates.reduce<[Array<[Date, number]>, Array<[Date, number]>]>(
      ([previous, acc], forecastDate: Date) => {
        const day = forecastDate.getDay();
        if (previous.length === 0) {
          // First column
          return [[[forecastDate, 1]], acc]
        } else {
          const [previousDate, span] = previous[0];
          if (previousDate.getDay() === day) {
            return [[[previousDate, span + 1]], acc]
          } else {
            // New day
            acc.push([previousDate, span]);
            return [[[forecastDate, 1]], acc]
          }
        }
      },
      [[], []]
    );
  if (lastDay.length !== 0) {
    days.push(lastDay[0]);
  }

  return el(
    'thead',
    el('tr', el('td', { style: stickyStyle }, 'Date'), days.map(([date, span]) => el('td', { style: { padding: '.2rem .3rem', textAlign: 'center', borderRight: 'solid thin gray' }, colspan: span }, date.toLocaleString(undefined, { month: 'short', weekday: 'short', day: 'numeric' })))),
    row('Time', forecastDates, date => `${date.getHours()}h`)
  )
}

const row = <A>(name: string, columns: Array<A>, show: (a: A) => string, title?: string): HTMLElement => {
  return el(
    'tr',
    el('td', { style: stickyStyle, title: title }, name),
    columns.map(column => el('td', { style: { padding: '.2rem .3rem', borderRight: 'solid thin gray' } }, show(column)))
  )
}

const tbody = (forecasts: Array<DetailedForecastData>): HTMLElement => {
  // TODO thq
  // TODO cumuli size
  // TODO cumuli base altitude
  // TODO wind at top of bl
  // TODO wind surface
  // TODO thunderstorm trend
  // TODO ground air temperature
  // TODO ground dew point
  // TODO mean sea level pressure
  // TODO altitude of 0° isotherm
  // TODO total rainfall level
  // TODO thunderstorm rainfall level
  return el(
    'tbody',
    row('BL Depth (m)', forecasts, forecast => `${forecast.bl.h}`, 'Boundary Layer Depth'),
    row('Wind (km/h)', forecasts, forecast => `${windSpeed(forecast)}`, 'Wind in Boundary Layer'),
    row('Clouds (%)', forecasts, forecast => `${forecast.c.e}`, 'Total Cloud Cover')
  )
}

// TODO Move somewhere else
const windSpeed = (forecast: DetailedForecastData): number => {
  const u = forecast.bl.u;
  const v = forecast.bl.v;
  return Math.round(Math.sqrt(u * u + v * v))
}
