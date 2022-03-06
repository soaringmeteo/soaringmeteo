package org.soaringmeteo.gfs

import cats.implicits._
import com.monovore.decline.{CommandApp, Opts}
import org.slf4j.LoggerFactory
import PathArgument.pathArgument

import scala.util.Try
import scala.util.control.NonFatal

object Main extends CommandApp(
  "soaringmeteo",
  "Download weather data, extract the relevant information for soaring pilots, and produce JSON data from it",
  main = {
    val csvLocationsFile = Opts.argument[os.Path]("CSV locations file")
    val gribsDir         = Opts.argument[os.Path]("GRIBs directory")
    val jsonDir          = Opts.argument[os.Path]("JSON directory")

    (csvLocationsFile, gribsDir, jsonDir).mapN(Soaringmeteo.run)
  }
)

object Soaringmeteo {
  private val logger = LoggerFactory.getLogger(getClass)

  def run(csvLocationsFile: os.Path, gribsDir: os.Path, jsonDir: os.Path): Unit = Try {
    val locationsByArea =
      Settings.gfsForecastLocations(csvLocationsFile)
        .groupBy { point =>
          Settings.gfsDownloadAreas
            .find(_.contains(point))
            .getOrElse(sys.error(s"${point} is not in the downloaded GFS areas"))
        }
    val gfsRun = in.ForecastRun.findLatest()
    val forecastsByHour = DownloadAndRead(gribsDir, gfsRun, locationsByArea)
    JsonWriter.writeJsons(jsonDir, gfsRun, forecastsByHour, locationsByArea.values.flatten)
    // Let’s keep the grib files because they are also used by the old soargfs
    // We should uncomment this line after we drop support for old soargfs
    // os.remove.all(gribsDir)
  }.recover {
    case NonFatal(error) => logger.error("Failed to run makegfsjson", error)
  }.get

}
