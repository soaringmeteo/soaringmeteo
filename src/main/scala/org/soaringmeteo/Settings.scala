package org.soaringmeteo

object Settings {

  /** Sequence of forecast hour offsets of a GFS run (e.g. 3, 6, 9, 12, etc.) */
  val forecastHours: Seq[Int] = (for {
    day  <- 0 to 9
    time <- 0 until 24 by gfsForecastTimeResolution
  } yield day * 24 + time).drop(1) // Drop the first forecast because it doesn't contain the same information as the others

  /**
   * Number of forecast periods displayed for a location and a day.
   * We currently keep three forecast periods per day: in the morning,
   * around noon, and in the afternoon.
   *
   * Changing this value changes the number of forecasts per day returned
   * in the detailed forecast for a specific location.
   */
  val relevantForecastPeriodsPerDay: Int = 3

  /**
   * Not really a setting, more a constant…
   * GFS produces forecasts by 3-hours steps.
   */
  lazy val gfsForecastTimeResolution: Int = 3

  /** Space between two points of the GFS forecast */
  val gfsForecastSpaceResolution: Int = 25 // Hundredth of degrees

  /**
   * Number of GFS forecasts per day
   */
  val numberOfForecastsPerDay: Int = 24 / gfsForecastTimeResolution

  /** The forecast locations we are interested in */
  val gfsForecastLocations: Seq[Point] =
    // Let’s focus on the alps only to avoid generating huge files
    for {
      longitude <- BigDecimal(4) to 18 by (BigDecimal(gfsForecastSpaceResolution) / 100)
      latitude  <- BigDecimal(42) to 49 by (BigDecimal(gfsForecastSpaceResolution) / 100)
    } yield Point(latitude, longitude)

}
