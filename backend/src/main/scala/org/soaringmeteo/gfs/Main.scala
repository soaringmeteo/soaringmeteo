package org.soaringmeteo.gfs

import cats.syntax.apply._
import com.monovore.decline.{CommandApp, Opts}
import org.slf4j.LoggerFactory
import PathArgument.pathArgument

import scala.util.Try
import scala.util.control.NonFatal

object Main extends CommandApp(
  "soaringmeteo",
  "Download weather data, extract the relevant information for soaring pilots, and produce JSON data from it",
  main = {
    val gribsDir         = Opts.argument[os.Path]("GRIBs directory")
    val jsonDir          = Opts.argument[os.Path]("JSON directory")

    val csvLocationsFile = Opts.option[os.Path](
      "locations-file",
      "CSV file containing a list of GFS points to cover in our results",
      "f"
    )
      .orNone

    val gfsRunInitTime = Opts.option[String](
      "gfs-run-init-time",
      "Initialization time of the GFS forecast to download ('00', '06', '12', or '18').",
      "t"
    )
      .validate("Valid values are '00', '06', '12', and '18'")(Set("00", "06", "12", "18"))
      .orNone

    val reusePreviousGribFiles = Opts.flag(
      "reuse-previous-grib-files",
      "Reuse the previously downloaded GRIB files instead of downloading them again.",
      "r"
    ).orFalse

    (gribsDir, jsonDir, csvLocationsFile, gfsRunInitTime, reusePreviousGribFiles).mapN(Soaringmeteo.run)
  }
)

object Soaringmeteo {
  private val logger = LoggerFactory.getLogger(getClass)

  def run(
    gribsDir: os.Path,
    jsonDir: os.Path,
    csvLocationsFile: Option[os.Path],
    maybeGfsRunInitTime: Option[String],
    reusePreviousGribFiles: Boolean
  ): Unit = Try {
    val locationsByArea =
      Settings.gfsForecastLocations(csvLocationsFile)
        .groupBy { point =>
          Settings.gfsDownloadAreas
            .find(_.contains(point))
            .getOrElse(sys.error(s"${point} is not in the downloaded GFS areas"))
        }
    val gfsRun = in.ForecastRun.findLatest(maybeGfsRunInitTime)
    if (!reusePreviousGribFiles) {
      logger.info("Removing old GRIB files")
      os.remove.all(gribsDir)
    }
    val forecastGribsDir = gfsRun.storagePath(gribsDir)
    val forecastsByHour = DownloadAndRead(forecastGribsDir, gfsRun, locationsByArea, reusePreviousGribFiles)
    JsonWriter.writeJsons(jsonDir, gfsRun, forecastsByHour, locationsByArea.values.flatten)
    logger.info("Done")
  }.recover {
    case NonFatal(error) => logger.error("Failed to run soaringmeteo", error)
  }.get

}
