import { LatestForecast, DetailedForecastData } from "./Forecast";

// We show three forecast periods per day: morning, noon, and afternoon
export const periodsPerDay = 3;
// The last forecast period we have is +186 hours after initialization time
export const lastForecastOffset = 186;

export const filterDetailedForecast = (gfsRun: LatestForecast, forecasts: Array<DetailedForecastData>, firstPeriodOffset: number): Array<[DetailedForecastData, Date]> => {

  const gfsRunDateTime = new Date(`${gfsRun.date}T${gfsRun.time}:00Z`);
  // Keep only `periodsPerDay` forecasts (e.g. we don’t show show the forecasts for the night)
  const forecastOffsets = Array.from({ length: periodsPerDay }, (_, i) => firstPeriodOffset + i * 3);
  return forecasts
    .map<[DetailedForecastData, number]>((forecast, i) => [forecast, gfsRunDateTime.getUTCHours() + (i + 1) * 3])
    .filter(([_, hourOffset]) => forecastOffsets.includes(hourOffset % 24))
    .map<[DetailedForecastData, Date]>(([forecast, hourOffset]) => {
      const date = new Date(gfsRunDateTime);
      date.setUTCHours(hourOffset);
      return [forecast, date]
    });

};

// TODO At some point, unify this operation with the one above
export const forecastOffsets = (gfsRunDateTime: Date, firstPeriodOffset: number): Array<[number, Date]> => {
  // UTC-offsets of the periods we are interested in in a day (e.g., [9, 12, 15] around longitude 0)
  const forecastUTCOffsets = Array.from({ length: periodsPerDay }, (_, i) => firstPeriodOffset + i * 3);
  return Array.from<unknown, [number, number]>({ length: (lastForecastOffset / 3) - 1 }, (_, i) => [gfsRunDateTime.getUTCHours() + (i + 1) * 3, (i + 1) * 3])
    .filter(([utcOffset, _]) => forecastUTCOffsets.includes(utcOffset % 24))
    .map(([utcOffset, gfsOffset]) => {
      const date = new Date(gfsRunDateTime);
      date.setUTCHours(utcOffset);
      return [gfsOffset, date]
    })
};
