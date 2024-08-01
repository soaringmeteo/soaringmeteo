import {fetchGfsForecastRun, fetchWrfForecastRun, ForecastMetadata} from "./ForecastMetadata";

/**
 * Fetch the metadata of all the GFS runs stored on the backend
 */
export const fetchGfsForecastRuns = async (): Promise<Array<ForecastMetadata>> => {
  const latestForecast = await fetchGfsForecastRun('forecast.json');
  // Compute date of the oldest forecast we want to show
  const oldestForecastInitDate = new Date(latestForecast.init);
  oldestForecastInitDate.setDate(oldestForecastInitDate.getDate() - latestForecast.history);
  // Fetch the previous forecasts
  const previousForecasts =
    await fetchPreviousGfsRuns(oldestForecastInitDate, latestForecast.previousRun);
  return previousForecasts.concat([latestForecast]);
}

const fetchPreviousGfsRuns = async (oldestForecastInitDate: Date, maybePreviousData?: [string, Date]): Promise<Array<ForecastMetadata>> => {
  if (maybePreviousData !== undefined && maybePreviousData[1] >= oldestForecastInitDate) {
    const forecast = await fetchGfsForecastRun(maybePreviousData[0]);
    return (await fetchPreviousGfsRuns(oldestForecastInitDate, forecast.previousRun)).concat([forecast]);
  } else {
    return []
  }
}

/**
 * Fetch the metadata of all the WRF runs stored on the backend.
 * Returns a pair containing the WRF6 runs and the WRF2 runs.
 */
export const fetchWrfForecastRuns = async (): Promise<[Array<ForecastMetadata>, Array<ForecastMetadata>]> => {
  const [latestWrf6Forecast, maybeLatestWrf2Forecast] = await fetchWrfForecastRun('forecast.json');

  // Compute date of the oldest forecast we want to show
  const oldestForecastInitDate = new Date(latestWrf6Forecast.init);
  oldestForecastInitDate.setDate(oldestForecastInitDate.getDate() - latestWrf6Forecast.history);

  // Fetch the previous forecasts
  const wrf6FirstTimeSteps = [latestWrf6Forecast.firstTimeStep.getTime()];
  const wrf2FirstTimeSteps = maybeLatestWrf2Forecast !== undefined ? [maybeLatestWrf2Forecast.firstTimeStep.getTime()] : [];
  const [previousWrf6Forecasts, previousWrf2Forecasts] =
    await fetchPreviousWrfRuns(oldestForecastInitDate, wrf6FirstTimeSteps, wrf2FirstTimeSteps, latestWrf6Forecast.previousRun);

  const wrf6Forecasts = previousWrf6Forecasts.concat([latestWrf6Forecast]).sort(byFirstTimeStep);
  const wrf2Forecasts = previousWrf2Forecasts.concat(maybeLatestWrf2Forecast !== undefined ? [maybeLatestWrf2Forecast] : []).sort(byFirstTimeStep);
  return [wrf6Forecasts, wrf2Forecasts];
}

const fetchPreviousWrfRuns = async (oldestForecastInitDate: Date, wrf6FirstTimeSteps: Array<number>, wrf2FirstTimeSteps: Array<number>, maybePreviousData?: [string, Date]): Promise<[Array<ForecastMetadata>, Array<ForecastMetadata>]> => {
  if (maybePreviousData !== undefined && maybePreviousData[1] >= oldestForecastInitDate) {
    const [wrf6Forecast, maybeWrf2Forecast] = await fetchWrfForecastRun(maybePreviousData[0]);

    // Don’t include older runs for a day that is already covered by a more recent run
    const filteredWrf6Forecast =
      wrf6FirstTimeSteps.includes(wrf6Forecast.firstTimeStep.getTime()) ? [] : [wrf6Forecast];
    const filteredWrf2Forecast =
      (maybeWrf2Forecast !== undefined) ?
        (wrf2FirstTimeSteps.includes(maybeWrf2Forecast.firstTimeStep.getTime()) ? [] : [maybeWrf2Forecast]) :
        [];

    const wrf6FirstTimeStepsUpdated =
      wrf6FirstTimeSteps.concat(filteredWrf6Forecast.map(forecast => forecast.firstTimeStep.getTime()));
    const wrf2FirstTimeStepsUpdated =
      wrf2FirstTimeSteps.concat(filteredWrf2Forecast.map(forecast => forecast.firstTimeStep.getTime()));

    const [previousWrf6Forecasts, previousWrf2Forecasts] =
      await fetchPreviousWrfRuns(oldestForecastInitDate, wrf6FirstTimeStepsUpdated, wrf2FirstTimeStepsUpdated, wrf6Forecast.previousRun);

    return [previousWrf6Forecasts.concat(filteredWrf6Forecast), previousWrf2Forecasts.concat(filteredWrf2Forecast)]
  } else {
    return [[], []]
  }
}

// Comparison function for sorting forecast runs by ascending order of first time step (e.g. the run for tomorrow will be after the run for today)
const byFirstTimeStep = (run1: ForecastMetadata, run2: ForecastMetadata): number =>
  run1.firstTimeStep.getTime() - run2.firstTimeStep.getTime();
