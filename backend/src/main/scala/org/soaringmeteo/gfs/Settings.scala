package org.soaringmeteo.gfs

import org.soaringmeteo.Point

import java.time.Period

object Settings {

  /** Sequence of forecast hour offsets of a GFS run (e.g. 3, 6, 9, 12, etc.) */
  val forecastHours: Seq[Int] = (for {
    day  <- 0 to 8
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
  def gfsForecastLocations(csvFile: os.Path): Seq[Point] = {
//    (gfsArea(Point(43, 3), Point(49, 17) /* alps */) ++ fromCsvFile(csvFile)).toSeq
    val westernEurope = gfsArea(Point(35, -11), Point(55, 30)) -- gfsArea(Point(44, -11), Point(47, -3)) -- gfsArea(Point(47, -11), Point(51, -6))
    (westernEurope ++ fromCsvFile(csvFile)).toSeq
  }

  def fromCsvFile(csvFile: os.Path): Set[Point] = {
    val step = BigDecimal(gfsForecastSpaceResolution) / 100
    for {
      location  <- GfsLocation.parse(os.read(csvFile)).to(Set)
      longitude <- (location.longitude - step) to (location.longitude + step) by step
      if longitude >= -180 && longitude <= 180
      latitude  <- (location.latitude - step) to (location.latitude + step) by step
      if latitude >= -90 && latitude <= 90
    } yield Point(latitude, longitude)
  }

  /**
   * @return All the GFS points that are in the area delimited by the two
   *         given points, `p1` and `p2`.
   */
  def gfsArea(p1: Point, p2: Point): Set[Point] = {
    val step = BigDecimal(gfsForecastSpaceResolution) / 100
    for {
      longitude <- (p1.longitude.min(p2.longitude) to p1.longitude.max(p2.longitude) by step).to(Set)
      latitude  <- p1.latitude.min(p2.latitude) to p1.latitude.max(p2.latitude) by step
    } yield Point(latitude, longitude)
  }

  /**
   * Areas defined by old soargfs.
   */
  val gfsDownloadAreas: Seq[Area] = Seq(
    Area("A",  -26,   57,  27,  65), // Europe
    Area("B",   71,  141, -10,  56), // Asia
    Area("C",   16,   56, -35,   2), // South Africa
    Area("D",  116,  177, -45, -21), // Australia
    Area("E", -159, -149, -18,  22), // Pacific
    Area("F", -125,  -70,  16,  52), // North America
    Area("G",  -81,  -37, -43,  11)  // South America
  )

  val gfsRootUrl = "https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl"

  /**
   * Number of days of old forecasts we keep
   */
  val forecastHistoryDays: Int = 2
  final def forecastHistory: Period = Period.ofDays(forecastHistoryDays)

}
