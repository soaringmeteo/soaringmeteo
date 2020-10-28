package org.soaringmeteo.gfs

import java.util.concurrent.Executors

import org.slf4j.LoggerFactory
import org.soaringmeteo.Point

import scala.concurrent.{Await, ExecutionContext, Future}
import scala.concurrent.duration.DurationInt

// Downloading is slow, but it seems that by starting several downloads in parallel
// makes the whole process faster (up to 5x), although we always download from the
// very same server... Maybe they limit the download rate per file, not per IP…?
object DownloadAndRead {

  private val logger = LoggerFactory.getLogger(getClass)

  /**
   * Downloads GRIB files from GFS forecast, and read relevant data from
   * them.
   * @return For each hour after initialization time we are interested
   *         in (see [[Settings.forecastHours]]), the forecast data
   *         for all the points we are interested in (see
   *         [[Settings.gfsForecastLocations]]).
   * @param gribsDir        Directory where GRIB files will be saved.
   *                        Note that the content of the directory will
   *                        be completely replaced.
   * @param gfsRun          The GFS run to download
   * @param locationsByArea The locations we want to read forecast for.
   */
  def apply(
    gribsDir: os.Path,
    gfsRun: GfsRun,
    locationsByArea: Map[Area, Seq[Point]]
  ): ForecastsByHour = {

    os.remove.all(gribsDir)
    os.makeDir.all(gribsDir)

    logger.info("Downloading forecast data")

    // We use the following thread-pool to manage the execution of the
    // tasks that download the forecast.
    val fourThreads = ExecutionContext.fromExecutorService(Executors.newFixedThreadPool(4))
    // We use the following thread-pool to manage the execution of the
    // tasks that read the forecast data from disk. This task uses
    // the grib library, which is not thread-safe, hence parallelism = 1.
    val oneThread = ExecutionContext.fromExecutorService(Executors.newSingleThreadExecutor())

    // Download a GRIB file as a background task
    def download(areaAndHour: AreaAndHour): Future[os.Path] =
      Future {
        concurrent.blocking {
          GribDownloader.download(gribsDir, gfsRun, areaAndHour)
        }
      }(fourThreads /* Beware, I’ve been banned for downloading 8 files in parallel */)

    // Read the content of a GRIB file as a background task
    def read(locations: Seq[Point], gribFile: os.Path, hourOffset: Int): Future[Forecast] =
      Future {
        concurrent.blocking {
          GfsForecast.fromGribFile(gribFile, gfsRun.initDateTime, hourOffset, locations)
        }
      }(oneThread /* Make sure we don't read multiple GRIB files in parallel */)

    val eventualForecast = locally {
      // For all the other cases, we just use the default execution context
      import scala.concurrent.ExecutionContext.Implicits.global
      Future
        .traverse(AreaAndHour.all) { areaAndHour =>
          val locations = locationsByArea(areaAndHour.area)
          for {
            gribFile <- download(areaAndHour)
            forecast <- read(locations, gribFile, areaAndHour.hourOffset)
          } yield (areaAndHour.hourOffset, forecast)
        }
        .map { forecastsByHour =>
          // TEMP Simulate old soargfs script for downloading data
          // We can safely remove this line after we drop support for old soargfs
          writeFilesForOldSoargfs(gribsDir)

          // We don't need these anymore
          oneThread.shutdown()
          fourThreads.shutdown()

          forecastsByHour.groupMapReduce { case (hour, _) => hour } { case (_, forecast) => forecast } { _ ++ _ }
        }

    }

    Await.result(eventualForecast, 5.hours)
  }

  private def writeFilesForOldSoargfs(gribsDir: os.Path): Unit = {
    os.write(gribsDir / "aDone.txt", "")
    os.write(gribsDir / "bDone.txt", "")
    os.write(gribsDir / "cDone.txt", "")
  }

}
