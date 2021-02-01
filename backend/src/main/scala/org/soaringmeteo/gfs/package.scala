package org.soaringmeteo

package object gfs {

  /** A forecast read from a GRIB file */
  type ForecastsByLocation = Map[Point, Forecast]
  /** Several forecasts, indexed by hour after initialization time */
  type ForecastsByHour = Map[Int, ForecastsByLocation]

}
