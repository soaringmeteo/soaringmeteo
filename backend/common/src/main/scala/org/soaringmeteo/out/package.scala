package org.soaringmeteo

import java.time.OffsetDateTime

package object out {
  /**
   * Version of the format of the forecast data we produce.
   * We need to bump this number everytime we introduce incompatibilities (e.g. adding a non-optional field).
   * Make sure to also bump the `formatVersion` in the frontend (see frontend/src/data/ForecastMetadata.ts).
   */
  val formatVersion = 6

  /**
   * Delete the target directories older than the `oldestForecastToKeep`.
   *
   * @param targetDir Directory that contains the `forecast.json` file and the subdirectories
   *                  named according to the initialization time of the forecast.
   */
  def deleteOldData(targetDir: os.Path, oldestForecastToKeep: OffsetDateTime): Unit = {
    for {
      path <- os.list(targetDir)
      date <- InitDateString.parse(path.last)
      if date.isBefore(oldestForecastToKeep)
    } os.remove.all(path)
  }

  /**
   * Update the last modification date of the marker file used by both GFS and WRF.
   *
   * External programs can use this information to know whether new forecast results
   * have been published.
   *
   * @param outputDir Root output directory (without [[formatVersion]]).
   */
  def touchMarkerFile(outputDir: os.Path): Unit = {
    try {
      os.write.over(outputDir / "marker", "")
    } catch {
      case exception: Exception => () // Ignore exceptions
    }
  }

}
