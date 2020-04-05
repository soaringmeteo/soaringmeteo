package org.soaringmeteo

import io.circe.Json
import org.slf4j.LoggerFactory

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
   * Extract data from the GFS forecast in the form of JSON documents. We create one JSON
   * document per forecast time (e.g., `soargfs-0.json`, `soargfs-3.json`, `soargfs-6.json`,
   * etc.), and each document contains the [[GfsForecast]] data for each location listed in
   * the file `gfsLocFile`.
   *
   * FIXME Create one file per type of data we want to show (boundary layer height, ThQ, etc.)
   *       so that users download only the necessary amount of data.
   *
   * @param gfsLocFile CSV file containing the information of the GFS points shown by soaringmeteo
   * @param gribsDir   Directory containing the .grib2 files of the GFS forecast
   * @param targetDir  Directory where we write our resulting JSON documents
   */
  def makeJsons(
    gfsLocFile: os.Path,
    gribsDir: os.Path,
    targetDir: os.Path
  ): Unit = {
    logger.debug("Parsing GFS locations CSV file")
    val gfsLocations = GfsLocation.parse(os.read(gfsLocFile))
    for {
      day  <- 0 to 7
      time <- 0 to 21 by 3
      t    = day * 24 + time
      if t < 189
    } {
      logger.debug(s"Extracting GFS forecast data at time $t")
      val forecast = GfsForecast.fromGribFile(gribsDir, t, gfsLocations)
      val fields =
        forecast.iterator.map { case (p, forecast) =>
          // Coordinates are multiplied by 100 so that they are always rendered as integer
          // values and never have a trailing `.0` which would make it complicated to read
          // from the client-side
          val locationKey = s"${(p.longitude * 100).intValue},${(p.latitude * 100).intValue}"
          locationKey -> GfsForecast.jsonEncoder(forecast)
        }.toSeq

      val targetFile = targetDir / s"soargfs-$t.json"
      os.makeDir.all(targetDir)
      os.write.over(targetFile, Json.obj(fields: _*).noSpaces)
    }
  }

}
