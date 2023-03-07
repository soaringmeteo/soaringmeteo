package org.soaringmeteo.gfs

import org.soaringmeteo.Point

package object out {

  /** A forecast read from a GRIB file */
  type ForecastsByLocation = Map[Point, out.Forecast]
  /** Several forecasts, indexed by hour after initialization time */
  type ForecastsByHour = Map[Int, ForecastsByLocation]

  /**
   * Version of the format of the forecast data we produce.
   * We need to bump this number everytime we introduce incompatibilities (e.g. adding a non-optional field).
   * Make sure to also bump the `formatVersion` in the frontend (see frontend/src/data/ForecastMetadata.ts).
   */
  val formatVersion = 0

}
