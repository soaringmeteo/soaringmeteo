package org.soaringmeteo.gfs

import io.circe.Json
import org.slf4j.LoggerFactory
import org.soaringmeteo.Point

import scala.collection.immutable.SortedMap

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
   * We create one JSON document per forecast time (e.g., `0.json`, `3.json`, `6.json`, etc.),
   * and each document contains the summary of the forecast for each location listed in
   * [[Settings.gfsForecastLocations]].
   *
   * We also create one JSON document per location (e.g., `700-4650.json`), where each
   * document contains the detail of the forecast for each period of forecast.
   *
   * @param targetDir Directory where we write our resulting JSON documents
   */
  def writeJsons(
    targetDir: os.Path,
    gfsRun: GfsRun,
    forecastsByHour: ForecastsByHour,
    locations: Iterable[Point]
  ): Unit = {
    logger.info(s"Writing soaring forecasts in $targetDir")
    os.remove.all(targetDir)
    os.makeDir.all(targetDir)

    writeForecastsByHour(forecastsByHour, targetDir)

    writeDetailedForecasts(
      locations,
      forecastsByHour,
      targetDir
    )

    writeMetadata(gfsRun, targetDir)
  }

  /**
   * Write one JSON file per hour of forecast, containing forecast data
   * for every point defined [[Settings.gfsForecastLocations]].
   */
  private def writeForecastsByHour(
    forecastsByHour: Map[Int, Map[Point, GfsForecast]],
    targetDir: os.Path
  ): Unit = {
    for ((t, forecast) <- forecastsByHour) {
      val fields =
        forecast.iterator.map { case (p, forecast) =>
          // Coordinates are indexed according to the resolution of the GFS model.
          // For instance, latitude 0.0 has index 0, latitude 0.25 has index 1, latitude 0.50 has
          // index 2, etc.
          val locationKey = s"${(p.longitude * 100 / Settings.gfsForecastSpaceResolution).intValue},${(p.latitude * 100 / Settings.gfsForecastSpaceResolution).intValue}"
          locationKey -> GfsForecast.jsonEncoder(forecast)
        }.toSeq

      val fileName = s"$t.json" // e.g., "3.json", "6.json", etc.
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
    locations: Iterable[Point],
    forecastsByHour: ForecastsByHour,
    targetDir: os.Path
  ): Unit = {
    // Make sure forecasts are in chronological order
    val forecasts = forecastsByHour.to(SortedMap).view.values.toSeq
    for (location <- locations) {
      val point = Point(location.latitude, location.longitude)
      logger.debug(s"Writing forecast for location ${location.longitude},${location.latitude}")
      val locationForecasts = LocationForecasts(point, forecasts.map(_(point)))
      // E.g., "750-4625.json"
      val fileName = s"${(location.longitude * 100).intValue}-${(location.latitude * 100).intValue}.json"
      os.write.over(
        targetDir / fileName,
        LocationForecasts.jsonEncoder(locationForecasts).noSpaces
      )
    }
  }

  private def writeMetadata(gfsRun: GfsRun, targetDir: os.Path): Unit = {
    val metadata = ForecastMetadata(gfsRun.initDateTime, Settings.forecastHours.last)
    os.write(
      targetDir / "forecast.json",
      ForecastMetadata.jsonCodec(metadata).noSpaces
    )
  }

}
