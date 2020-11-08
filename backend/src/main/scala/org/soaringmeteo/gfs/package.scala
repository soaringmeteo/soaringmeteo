package org.soaringmeteo

package object gfs {

  /** A forecast read from a GRIB file */
  type Forecast = Map[Point, GfsForecast]
  /** Several forecasts, indexed by hour after initialization time */
  type ForecastsByHour = Map[Int, Forecast]

}
