package org.soaringmeteo.gfs

import org.soaringmeteo.Point

package object out {

  /** A forecast read from a GRIB file */
  type ForecastsByLocation = Map[Point, out.Forecast]
  /** Several forecasts, indexed by hour after initialization time */
  type ForecastsByHour = Map[Int, ForecastsByLocation]

}
