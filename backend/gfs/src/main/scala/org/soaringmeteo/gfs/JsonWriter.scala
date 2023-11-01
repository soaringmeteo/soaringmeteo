package org.soaringmeteo.gfs

import geotrellis.vector.Extent
import org.slf4j.LoggerFactory
import org.soaringmeteo.gfs.out.{Store, runTargetPath, subgridTargetPath}
import org.soaringmeteo.out.{ForecastMetadata, JsonData, deleteOldData}
import org.soaringmeteo.{InitDateString, Point}

import java.time.OffsetDateTime
import scala.collection.mutable
import scala.concurrent.Await
import scala.concurrent.duration.DurationInt

/**
 * Produce soaring forecast data from the GFS forecast data.
 *
 * GFS runs produce one file per time-step of forecast, and each file contains the forecast
 * data of all the locations in the world.
 *
 * We want to structure data differently: we want to gather, for one location, the
 * forecast data of several times.
 */
object JsonWriter {

  private val logger = LoggerFactory.getLogger(getClass)

  /**
   * Extract data from the GFS forecast in the form of JSON documents.
   *
   *
   * @param versionedTargetDir Directory where we write our resulting JSON documents
   */
  def writeJsons(
    versionedTargetDir: os.Path,
    gfsRun: in.ForecastRun,
  ): Unit = {
    val initDateString = InitDateString(gfsRun.initDateTime)
    // Write all the data in a subdirectory named according to the
    // initialization time of the GFS run (e.g., `2021-01-08T12`).
    val targetRunDir = runTargetPath(versionedTargetDir, initDateString)
    logger.info(s"Writing location forecasts in $targetRunDir")

    for (subgrid <- Settings.gfsSubgrids) {
      // Write the data corresponding to every subgrid in a specific subdirectory
      val subgridTargetDir = subgridTargetPath(targetRunDir, subgrid)

      // We write the detailed forecast over time of every point of the grid. To avoid creating
      // many files, we group the points into clusters and create one file per cluster (e.g.,
      // `2021-01-08T12/europe-africa/locations/{x}-{y}.json`, where x and y are the coordinates
      // of the cluster)
      writeForecastsByLocation(gfsRun.initDateTime, subgrid, subgridTargetDir)
    }

    // Update the file `forecast.json` in the root target directory
    // and rename the old `forecast.json`, if any
    overwriteLatestForecastMetadata(initDateString, gfsRun, versionedTargetDir)

    // Finally, we remove files older than five days ago from the target directory
    val oldestForecastToKeep = gfsRun.initDateTime.minus(Settings.forecastHistory)
    deleteOldData(versionedTargetDir, oldestForecastToKeep)
  }

  /**
   * Write one JSON file per every 16 points, containing the forecast data for
   * the next days.
   */
  private def writeForecastsByLocation(
    initTime: OffsetDateTime,
    subgrid: Subgrid,
    targetDir: os.Path
  ): Unit = {
    val forecastHours =
      Settings.forecastHours.map(hourOffset => (hourOffset, initTime.plusHours(hourOffset)))

    val cache = mutable.Map.empty[BigDecimal, OffsetDateTime => Boolean]

    JsonData.writeForecastsByLocation(
      s"subgrid ${subgrid.id}",
      subgrid.width,
      subgrid.height,
      targetDir
    ) { (x, y) =>
      val location = Point(subgrid.latitudes(y), subgrid.longitudes(x))
      val isRelevant =
        cache.getOrElseUpdate(location.longitude, relevantTimeStepsForLocation(location))
      val relevantHours =
        forecastHours
          .view
          .filter { case (_, time) => isRelevant(time) }
          .map(_._1)
          .toSet
      Await.result(Store.forecastForLocation(initTime, subgrid, x, y, relevantHours), 300.second)
    }
  }

  def relevantTimeStepsForLocation(location: Point): OffsetDateTime => Boolean = {
    // Transform longitude so that it goes from 0 to 360 instead of 180 to -180
    val normalizedLongitude = 180 - location.longitude
    // Width of each zone, in degrees
    val zoneWidthDegrees = 360 / Settings.numberOfForecastsPerDay
    // Width of each zone, in hours
    val zoneWidthHours = Settings.gfsForecastTimeResolution
    // Noon time offset is 12 around prime meridian, 0 on the other side of the
    // earth, and 6 on the east and 21 on the west.
    // For example, a point with a longitude of 7 (e.g., Bulle) will have a normalized
    // longitude of 173. If we divide this number of degrees by the width of a zone,
    // we get its zone number, 4. Finally, we multiply this zone number by the number of
    // hours of a zone, we get the noon time for this longitude, 12.
    val noonHour =
      ((normalizedLongitude + (zoneWidthDegrees / 2.0)) % 360).doubleValue.round.toInt / zoneWidthDegrees * zoneWidthHours

    val allHours = (0 until 24 by Settings.gfsForecastTimeResolution).to(Set)

    val relevantHours: Set[Int] =
      (1 to Settings.relevantForecastPeriodsPerDay).foldLeft((allHours, Set.empty[Int])) {
        case ((hs, rhs), _) =>
          val rh = hs.minBy(h => math.min(noonHour + 24 - h, math.abs(h - noonHour)))
          (hs - rh, rhs + rh)
      }._2

    time => {
      relevantHours.contains(time.getHour)
    }
  }

  /**
   * Update file `forecast.json` to point to the latest forecast data.
   *
   * @param initDateString Init date prefix
   * @param gfsRun         GFS run
   * @param targetDir      Target directory
   */
  private def overwriteLatestForecastMetadata(initDateString: String, gfsRun: in.ForecastRun, targetDir: os.Path): Unit = {
    val zones =
      for (subgrid <- Settings.gfsSubgrids) yield {
        val resolution = BigDecimal("0.25")
        ForecastMetadata.Zone(
          subgrid.id,
          subgrid.label,
          ForecastMetadata.Raster(
            projection = "EPSG:4326" /* WGS84 */,
            resolution,
            Extent(
              subgrid.leftLongitude.doubleValue,
              subgrid.bottomLatitude.doubleValue,
              subgrid.rightLongitude.doubleValue,
              subgrid.topLatitude.doubleValue
            ).buffer((resolution / 2).doubleValue) // Add buffer because we draw rectangles, not points
          ),
          ForecastMetadata.VectorTiles(subgrid.vectorTilesParameters)
        )
      }
    ForecastMetadata.overwriteLatestForecastMetadata(
      targetDir,
      Settings.forecastHistory.getDays,
      initDateString,
      gfsRun.initDateTime,
      maybeFirstTimeStep = None, // In GFS, the first time-step is always the same as the initialization time
      Settings.forecastHours.last,
      zones
    )
  }

}
