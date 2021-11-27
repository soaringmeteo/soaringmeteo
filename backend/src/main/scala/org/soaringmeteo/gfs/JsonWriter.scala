package org.soaringmeteo.gfs

import io.circe
import io.circe.Json
import org.slf4j.LoggerFactory
import org.soaringmeteo.Point
import org.soaringmeteo.gfs.out.{ ForecastsByHour, Forecast, ForecastMetadata, InitDateString, LocationForecasts }

import scala.collection.immutable.SortedMap
import scala.util.Try

/**
 * Produce soaring forecast data from the GFS forecast data.
 *
 * GFS runs produce one file per time of forecast, and each file contains the forecast
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
   * We create one JSON document per forecast time (e.g., `2021-01-08T12+0.json`, `2021-01-08T12+3.json`, etc.),
   * and each document contains the summary of the forecast for each location listed in
   * [[Settings.gfsForecastLocations]].
   *
   * We also create one JSON document per location (e.g., `2021-01-08T12-700-4650.json`), where each
   * document contains the detail of the forecast for each period of forecast.
   *
   * Finally, we remove files older than five days ago from the target directory.
   *
   * @param targetDir Directory where we write our resulting JSON documents
   */
  def writeJsons(
    targetDir: os.Path,
    gfsRun: in.ForecastRun,
    forecastsByHour: ForecastsByHour,
    locations: Iterable[Point]
  ): Unit = {
    logger.info(s"Writing soaring forecasts in $targetDir")
    os.makeDir.all(targetDir)

    val initDateString = InitDateString(gfsRun.initDateTime)

    writeForecastsByHour(initDateString, forecastsByHour, targetDir)

    writeDetailedForecasts(
      initDateString,
      locations,
      forecastsByHour,
      targetDir
    )

    writeMetadata(initDateString, gfsRun, targetDir)

    deleteOldData(gfsRun, targetDir)
  }

  /**
   * Write one JSON file per hour of forecast, containing forecast data
   * for every point defined [[Settings.gfsForecastLocations]].
   */
  private def writeForecastsByHour(
    initDateString: String,
    forecastsByHour: ForecastsByHour,
    targetDir: os.Path
  ): Unit = {
    for ((t, forecastsByLocation) <- forecastsByHour) {
      val fields =
        forecastsByLocation.iterator.map { case (p, forecast) =>
          // Coordinates are indexed according to the resolution of the GFS model.
          // For instance, latitude 0.0 has index 0, latitude 0.25 has index 1, latitude 0.50 has
          // index 2, etc.
          val locationKey = s"${(p.longitude * 100 / Settings.gfsForecastSpaceResolution).intValue},${(p.latitude * 100 / Settings.gfsForecastSpaceResolution).intValue}"
          locationKey -> Forecast.jsonEncoder(forecast)
        }.toSeq

      val fileName = s"$initDateString+$t.json" // e.g., "2021-01-08T12+3.json", "2021-01-08T12+6.json", etc.
      os.write.over(
        targetDir / fileName,
        Json.obj(fields: _*).noSpaces
      )
    }
  }

  /**
   * Write one JSON file per point containing the forecast data for
   * the next days.
   */
  private def writeDetailedForecasts(
    initDateString: String,
    locations: Iterable[Point],
    forecastsByHour: ForecastsByHour,
    targetDir: os.Path
  ): Unit = {
    // Make sure forecasts are in chronological order
    val forecasts = forecastsByHour.to(SortedMap).view.values.toSeq
    for (location <- locations) {
      val point = Point(location.latitude, location.longitude)
      logger.trace(s"Writing forecast for location ${location.longitude},${location.latitude}")
      val locationForecasts = LocationForecasts(point, forecasts.map(_(point)))
      // E.g., "2021-01-08T12-750-4625.json"
      val fileName = s"$initDateString-${(location.longitude * 100).intValue}-${(location.latitude * 100).intValue}.json"
      os.write.over(
        targetDir / fileName,
        LocationForecasts.jsonEncoder(locationForecasts).noSpaces
      )
    }
  }

  private def writeMetadata(initDateString: String, gfsRun: in.ForecastRun, targetDir: os.Path): Unit = {
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
      ForecastMetadata(initDateString, gfsRun.initDateTime, Settings.forecastHours.last, maybePreviousForecastInitDateTime)
    os.write.over(
      latestForecastPath,
      ForecastMetadata.jsonCodec(metadata).noSpaces
    )
  }

  private def deleteOldData(gfsRun: in.ForecastRun, targetDir: os.Path): Unit = {
    val oldestForecastToKeep = gfsRun.initDateTime.minus(Settings.forecastHistory)
    for {
      path <- os.list(targetDir)
      date <- InitDateString.parse(path.last)
      if date.isBefore(oldestForecastToKeep)
    } os.remove(path)
  }

}
