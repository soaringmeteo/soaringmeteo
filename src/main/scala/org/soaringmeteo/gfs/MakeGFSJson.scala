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
object MakeGFSJson {

  private val logger = LoggerFactory.getLogger(getClass)

  /**
   * Alternate entry point that only converts the grib files into JSON files.
   * Requires the grib files to have been downloaded first, for instance by
   * running [[DownloadGribFiles.main]]
   */
  def main(args: Array[String]): Unit = {
    val csvLocationsFile = os.Path(args(0))
    val gribsDir         = os.Path(args(1))
    val jsonDir          = os.Path(args(2))

    MakeGFSJson.makeJsons(csvLocationsFile, gribsDir, jsonDir, FindLatestRun.now())
  }

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
   * @param csvLocationsFile CSV file containing GFS locations
   * @param gribsDir         Directory containing the .grib2 files of the GFS forecast
   * @param targetDir        Directory where we write our resulting JSON documents
   */
  def makeJsons(
    csvLocationsFile: os.Path,
    gribsDir: os.Path,
    targetDir: os.Path,
    gfsRun: GfsRun
  ): Unit = {
    os.remove.all(targetDir)
    os.makeDir.all(targetDir)
    os.copy.over(gribsDir / "forecast.json", targetDir / "forecast.json", replaceExisting = true)

    val locationsByArea =
      Settings.gfsForecastLocations(csvLocationsFile)
        .groupBy { point =>
          Settings.gfsDownloadAreas
            .find(_.contains(point))
            .getOrElse(sys.error(s"${point} is not in the downloaded GFS areas"))
        }

    // Forecasts indexed by hour offset from the initialization time
    val forecastsSortedByHour: SortedMap[Int, Map[Point, GfsForecast]] =
      (for {
        area <- Settings.gfsDownloadAreas
        t    <- Settings.forecastHours
      } yield {
        val locations = locationsByArea(area)
        logger.debug(s"Processing GFS forecast data in area ${area.id} at time $t")
        val forecast =
          GfsForecast.fromGribFile(gribsDir / gfsRun.fileName(t, area), gfsRun.initDateTime, t, locations)
        (t, forecast)
      })
        // Concatenate the forecasts of all the areas at the same hour
        .groupMapReduce { case (hour, _) => hour } { case (_, forecast) => forecast } { _ ++ _ }
        .to(SortedMap)

    writeForecastsByHour(forecastsSortedByHour, targetDir)

    writeDetailedForecasts(
      locationsByArea.values.flatten,
      forecastsSortedByHour.view.values.toSeq,
      targetDir
    )
  }

  /**
   * Write one JSON file per hour of forecast, containing forecast data
   * for every point defined [[Settings.gfsForecastLocations]].
   */
  private def writeForecastsByHour(
    forecastsByHour: Map[Int, Map[Point, GfsForecast]],
    targetDir: os.Path
  ) = {
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
   * @param forecasts All the forecasts ''in chronological order''
   */
  private def writeDetailedForecasts(
    locations: Iterable[Point],
    forecasts: Seq[Map[Point, GfsForecast]],
    targetDir: os.Path
  ) = {
    for (gfsLocation <- locations) {
      val point = Point(gfsLocation.latitude, gfsLocation.longitude)
      logger.debug(s"Writing forecast for location ${gfsLocation.longitude},${gfsLocation.latitude}")
      val locationForecasts = LocationForecasts(point, forecasts.map(_(point)))
      // E.g., "750-4625.json"
      val fileName = s"${(gfsLocation.longitude * 100).intValue}-${(gfsLocation.latitude * 100).intValue}.json"
      os.write.over(
        targetDir / fileName,
        LocationForecasts.jsonEncoder(locationForecasts).noSpaces
      )
    }
  }

}
