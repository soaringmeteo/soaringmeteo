package org.soaringmeteo.gfs

import com.typesafe.config.ConfigFactory
import org.soaringmeteo.Point

import java.time.Period

object Settings {

  val config = ConfigFactory.load().getConfig("soargfs")

  val downloadRateLimit = config.getInt("download_rate_limit")

  /** Sequence of forecast hour offsets of a GFS run (e.g. 3, 6, 9, 12, etc.) */
  val forecastHours: Seq[Int] = (for {
    day  <- 0 to config.getInt("forecast_length")
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
    val scandinavia =
      gfsArea(Point(58, 5), Point(69, 28)) --
        gfsArea(Point(65, 5), Point(69, 11)) --
        gfsArea(Point(64, 9), Point(BigDecimal("64.75"), 5))
    val westernEurope =
      gfsArea(Point(35, -11), Point(55, 30)) --
        gfsArea(Point(44, -11), Point(47, -3)) --
        gfsArea(Point(47, -11), Point(51, -6)) --
        gfsArea(Point(35, BigDecimal("17.5")), Point(39, 20)) --
        gfsArea(Point(BigDecimal("40.5"), 4), Point(BigDecimal("42.75"), BigDecimal("7.75"))) --
        gfsArea(Point(BigDecimal("38.5"), BigDecimal("10.25")), Point(BigDecimal("40.5"), 14)) --
        gfsArea(Point(BigDecimal("37.5"), BigDecimal("2.25")), Point(39, 8)) --
        gfsArea(Point(BigDecimal("57.5"), BigDecimal("0.25")), Point(54, BigDecimal("7.5"))) --
        gfsArea(Point(BigDecimal("39.25"), BigDecimal("4.75")), Point(BigDecimal("40.25"), BigDecimal("7.75"))) --
        gfsArea(Point(BigDecimal("37.5"), BigDecimal("15.75")), Point(35, BigDecimal("17.25"))) --
        gfsArea(Point(BigDecimal("36.25"), BigDecimal("22.5")), Point(35, BigDecimal("20.25"))) --
        gfsArea(Point(BigDecimal("39.25"), BigDecimal("4.75")), Point(BigDecimal("40.25"), 8)) --
        gfsArea(Point(BigDecimal("37.5"), BigDecimal("8.25")), Point(BigDecimal("38.75"), BigDecimal("12.25"))) --
        gfsArea(Point(35, -11), Point(BigDecimal("36.75"), BigDecimal("-6.75"))) --
        gfsArea(Point(BigDecimal("43.75"), -11), Point(35, BigDecimal("-9.75")))
    val southAfrica =
      gfsArea(
        Point(BigDecimal("-34.25"), BigDecimal("18.25")), // Cape Town
        Point(-28, 24) // Mont Temple
      )
    val himalaya =
      gfsArea(
        Point(BigDecimal(36), BigDecimal(77)),
        Point(BigDecimal("35.25"), BigDecimal(75))
      )
    (westernEurope ++ scandinavia ++ southAfrica ++ himalaya ++ fromCsvFile(csvFile)).toSeq
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
    Area("A",  -26,   57,  27,  69), // Europe
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
  val forecastHistory: Period = Period.ofDays(config.getInt("forecast_history"))

}
