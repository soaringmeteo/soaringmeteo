package org.soaringmeteo.gfs

import geotrellis.vector.Extent
import io.circe
import io.circe.Json
import org.slf4j.LoggerFactory
import org.soaringmeteo.Point
import org.soaringmeteo.gfs.out.{Forecast, ForecastMetadata, InitDateString, LocationForecasts, Store, VectorTiles, runTargetPath, subgridTargetPath}
import org.soaringmeteo.util.WorkReporter

import java.time.OffsetDateTime
import scala.concurrent.Await
import scala.concurrent.duration.DurationInt
import scala.util.Try

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
    deleteOldData(gfsRun, versionedTargetDir)
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
    val k = 4 // clustering factor
    val reporter = new WorkReporter(subgrid.size / (k * k), s"Writing location forecasts for subgrid ${subgrid.id}", logger)
    for {
      (longitudes, xCluster) <- subgrid.longitudes.grouped(k).zipWithIndex
      (latitudes,  yCluster) <- subgrid.latitudes.grouped(k).zipWithIndex
    } {
      val forecastHours =
        Settings.forecastHours.map(hourOffset => (hourOffset, initTime.plusHours(hourOffset)))
      val forecastsCluster: IndexedSeq[IndexedSeq[Map[Int, Forecast]]] = {
        val xMin = xCluster * k
        val yMin = yCluster * k
        for ((longitude, x) <- longitudes.zip(Iterator.from(xMin))) yield {
          for ((latitude, y) <- latitudes.zip(Iterator.from(yMin)))
            yield {
              val location = Point(latitude, longitude)
              // TODO That could be optimized further (e.g. pre-compute for every grid point)
              val relevantHours =
                forecastHours
                  .view
                  .filter { case (_, time) => LocationForecasts.isRelevant(location)(time) }
                  .map(_._1)
                  .toSet
              Await.result(Store.forecastForLocation(initTime, subgrid, x, y, relevantHours), 300.second)
            }
        }
      }
      logger.trace(s"Writing forecast for cluster (${xCluster}-${yCluster}) including longitudes ${longitudes} and latitudes ${latitudes}.")
      val json =
        Json.arr(forecastsCluster.map { forecastColumns =>
          Json.arr(forecastColumns.map { forecastsByHour =>
            val locationForecasts = LocationForecasts(forecastsByHour.toSeq.sortBy(_._1).map(_._2))
            LocationForecasts.jsonEncoder(locationForecasts)
          }: _*)
        }: _*)
      // E.g., "12-34.json"
      val fileName = s"${xCluster}-${yCluster}.json"
      os.write.over(
        targetDir / "locations" / fileName,
        json.noSpaces,
        createFolders = true
      )
      reporter.notifyCompleted()
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
    val latestForecastPath = targetDir / "forecast.json"
    // If a previous forecast is found, rename its metadata file
    val maybePreviousForecastInitDateTime =
      for {
        _        <- Option.when(os.exists(latestForecastPath))(())
        str      <- Try(os.read(latestForecastPath)).toOption // FIXME Log more errors
        json     <- circe.parser.parse(str).toOption
        metadata <- ForecastMetadata.jsonCodec.decodeJson(json).toOption
        path      = ForecastMetadata.archivedForecastFileName(metadata.initDateTime)
        _        <- Try(os.move(latestForecastPath, targetDir / path)).toOption
      } yield metadata.initDateTime

    val metadata =
      ForecastMetadata(
        initDateString,
        gfsRun.initDateTime,
        Settings.forecastHours.last,
        maybePreviousForecastInitDateTime,
        for (subgrid <- Settings.gfsSubgrids) yield {
          ForecastMetadata.Zone(
            subgrid.id,
            subgrid.label,
            ForecastMetadata.Raster(
              "EPSG:4326",
              Extent(
                subgrid.leftLongitude.doubleValue,
                subgrid.bottomLatitude.doubleValue,
                subgrid.rightLongitude.doubleValue,
                subgrid.topLatitude.doubleValue
              ).buffer(0.125) // Add buffer because we draw rectangles, not points
            ),
            ForecastMetadata.VectorTiles(
              subgrid.vectorTilesParameters.extent,
              subgrid.vectorTilesParameters.zoomLevels,
              subgrid.vectorTilesParameters.minViewZoom,
            )
          )
        }
      )
    os.write.over(
      latestForecastPath,
      ForecastMetadata.jsonCodec(metadata).noSpaces
    )
  }

  /**
   * Delete the target directories older than `Settings.forecastHistory` days compared
   * to the initialization time of given `gfsRun`.
   *
   * @param targetDir Directory that contains the `forecast.json` file and the subdirectories
   *                  named according to the initialization time of the forecast.
   */
  private def deleteOldData(gfsRun: in.ForecastRun, targetDir: os.Path): Unit = {
    val oldestForecastToKeep = gfsRun.initDateTime.minus(Settings.forecastHistory)
    for {
      path    <- os.list(targetDir)
      date    <- InitDateString.parse(path.last)
      if date.isBefore(oldestForecastToKeep)
    } os.remove.all(path)
  }

}
