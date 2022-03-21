package org.soaringmeteo.gfs

import java.util.concurrent.Executors

import com.google.common.util.concurrent.ThreadFactoryBuilder
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
   * @param reusePreviousGribFiles Whether to reuse the previously downloaded GRIB
   *                               files (for the given `gfsRun`) instead of
   *                               downloading them again.
   */
  def apply(
    gribsDir: os.Path,
    gfsRun: in.ForecastRun,
    locationsByArea: Map[Area, Seq[Point]],
    reusePreviousGribFiles: Boolean
  ): out.ForecastsByHour = {

    if (!reusePreviousGribFiles) {
      os.remove.all(gribsDir)
    }
    os.makeDir.all(gribsDir)

    logger.info("Downloading forecast data")

    // Daemonic so that it won't prevent the application from shutting down
    val daemonicThreadFactory = new ThreadFactoryBuilder().setDaemon(true).build()
    // We use the following thread-pool to manage the execution of the
    // tasks that download the forecast.
    val fourThreads = ExecutionContext.fromExecutorService(Executors.newFixedThreadPool(4, daemonicThreadFactory))
    // We use the following thread-pool to manage the execution of the
    // tasks that read the forecast data from disk. This task uses
    // the grib library, which is not thread-safe, hence parallelism = 1.
    val oneThread = ExecutionContext.fromExecutorService(Executors.newSingleThreadExecutor(daemonicThreadFactory))

    // Download a GRIB file as a background task
    def download(areaAndHour: AreaAndHour): Future[os.Path] = {
      val gribFile = gribsDir / gfsRun.fileName(areaAndHour)
      if (reusePreviousGribFiles && os.exists(gribFile)) {
        logger.info(s"Not downloading ${areaAndHour} because $gribFile already exists")
        Future.successful(gribFile)
      } else {
        Future {
          concurrent.blocking {
            GribDownloader.download(gribFile, gfsRun, areaAndHour)
            gribFile
          }
        }(fourThreads /* NCEP currently limits usage to 120/hits per minute */)
      }
    }

    // Read the content of a GRIB file as a background task
    def read(locations: Seq[Point], gribFile: os.Path, hourOffset: Int): Future[Map[Point, in.Forecast]] =
      Future {
        concurrent.blocking {
          in.Forecast.fromGribFile(gribFile, gfsRun.initDateTime, hourOffset, locations)
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

          out.Forecast(
            forecastsByHour
              // Merge together all the forecasts from the different areas
              .groupMapReduce { case (hour, _) => hour } { case (_, forecast) => forecast } { _ ++ _ }
          )
        }

    }

    Await.result(eventualForecast, 8.hours)
  }

  private def writeFilesForOldSoargfs(gribsDir: os.Path): Unit = {
    os.write.over(gribsDir / "aDone.txt", "")
    os.write.over(gribsDir / "bDone.txt", "")
    os.write.over(gribsDir / "cDone.txt", "")
  }

}
