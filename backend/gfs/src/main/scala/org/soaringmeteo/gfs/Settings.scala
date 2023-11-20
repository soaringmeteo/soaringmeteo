package org.soaringmeteo.gfs

import com.typesafe.config.ConfigFactory

import scala.jdk.CollectionConverters._
import java.time.Period

object Settings {

  val config = ConfigFactory.load().getConfig("soargfs")

  val downloadRateLimit: Int = config.getInt("download_rate_limit")

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

  /**
   * Zones of the GFS domain that we want to cover
   */
  val gfsSubgrids: Seq[Subgrid] =
    config.getConfigList("subgrids").asScala.map { entryConfig =>
      val id = entryConfig.getString("id")
      val extent = entryConfig.getStringList("extent").asScala.map(BigDecimal(_))
      val label = entryConfig.getString("label")
      val vectorTileSize = entryConfig.getInt("vectorTileSize")
      Subgrid(id, label, vectorTileSize, extent(0), extent(1), extent(2), extent(3))
    }.toSeq

  val gfsRootUrl = "https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl"

  /**
   * Number of days of old forecasts we keep
   */
  val forecastHistory: Period = Period.ofDays(config.getInt("forecast_history"))

}
