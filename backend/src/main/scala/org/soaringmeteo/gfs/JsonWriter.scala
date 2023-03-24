package org.soaringmeteo.gfs

import io.circe
import io.circe.Json
import org.slf4j.LoggerFactory
import org.soaringmeteo.Point
import org.soaringmeteo.gfs.out.{Forecast, ForecastMetadata, ForecastsByHour, InitDateString, LocationForecasts, OutputVariable, formatVersion}

import java.nio.file.Files
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
   *
   * @param targetDir Directory where we write our resulting JSON documents
   */
  def writeJsons(
    targetDir: os.Path,
    gfsRun: in.ForecastRun,
    forecastsByHour: ForecastsByHour,
    locations: Iterable[Point]
  ): Unit = {
    // Directory for our version of the forecast data format
    val versionedTargetDir = targetDir / formatVersion.toString
    val initDateString = InitDateString(gfsRun.initDateTime)
    // Write all the JSON documents in a subdirectory named according to the
    // initialization time of the GFS run (e.g., `2021-01-08T12`).
    val targetRunDir = versionedTargetDir / initDateString
    logger.info(s"Writing soaring forecasts in $targetRunDir")
    os.makeDir.all(targetRunDir)

    // We create one JSON document per forecast time and per output variable (e.g., `2021-01-08T12/soaring-layer/0h.json`,
    // `2021-01-08T12/wind-300m-agl/3h.json`, etc.).
    // Each document contains the forecast for that parameter (soaring layer depth, wind, etc.) and for each location
    // listed in Settings.gfsForecastLocations
    writeForecastsByHour(forecastsByHour, targetRunDir)

    // We also create one JSON document per location (e.g., `2021-01-08T12/locations/700-4650.json`), where each
    // document contains the detail of the forecast for each period of forecast
    writeLocationsForecasts(locations, forecastsByHour, targetRunDir)

    // Update the file `forecast.json` in the root target directory
    // and rename the old `forecast.json`, if any
    overwriteLatestForecastMetadata(initDateString, gfsRun, versionedTargetDir)

    // Finally, we remove files older than five days ago from the target directory
    deleteOldData(gfsRun, targetDir)
  }

  /**
   * Write one JSON file per hour of forecast and per output variable, containing forecast data
   * for every point defined [[Settings.gfsForecastLocations]].
   */
  private def writeForecastsByHour(
    forecastsByHour: ForecastsByHour,
    targetDir: os.Path
  ): Unit = {
    for {
      (t, forecastsByLocation) <- forecastsByHour
      outputVariable           <- OutputVariable.gfsOutputVariables
    } {
      val fields =
        forecastsByLocation.iterator.map { case (p, forecast) =>
          // Coordinates are indexed according to the resolution of the GFS model.
          // For instance, latitude 0.0 has index 0, latitude 0.25 has index 1, latitude 0.50 has
          // index 2, etc.
          val locationKey = s"${(p.longitude * 100 / Settings.gfsForecastSpaceResolution).intValue},${(p.latitude * 100 / Settings.gfsForecastSpaceResolution).intValue}"
          locationKey -> outputVariable.toJson(forecast)
        }.toSeq

      val fileName = s"${t}h.json" // e.g., "3h.json", "6h.json", etc.
      os.write.over(
        targetDir / outputVariable.path / fileName,
        Json.obj(fields: _*).noSpaces,
        createFolders = true
      )
    }
  }

  /**
   * Write one JSON file per point containing the forecast data for
   * the next days.
   */
  private def writeLocationsForecasts(
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
      // E.g., "750-4625.json"
      val fileName = s"${(location.longitude * 100).intValue}-${(location.latitude * 100).intValue}.json"
      os.write.over(
        targetDir / "locations" / fileName,
        LocationForecasts.jsonEncoder(locationForecasts).noSpaces,
        createFolders = true
      )
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
      ForecastMetadata(initDateString, gfsRun.initDateTime, Settings.forecastHours.last, maybePreviousForecastInitDateTime)
    os.write.over(
      latestForecastPath,
      ForecastMetadata.jsonCodec(metadata).noSpaces
    )
  }

  private def deleteOldData(gfsRun: in.ForecastRun, targetDir: os.Path): Unit = {
    val oldestForecastToKeep = gfsRun.initDateTime.minus(Settings.forecastHistory)
    for {
      version <- os.list(targetDir)
      if Files.isDirectory(version.toNIO)
      path    <- os.list(version)
      date    <- InitDateString.parse(path.last)
      if date.isBefore(oldestForecastToKeep)
    } os.remove.all(path)
  }

}
