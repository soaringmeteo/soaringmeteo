package org.soaringmeteo.gfs

import org.soaringmeteo.Point

import scala.concurrent.{Await, Future, Promise}
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration.DurationInt
import scala.util.{Failure, Success}

// Downloading is slow, but it seems that by starting several downloads in parallel
// makes the whole process faster (up to 5x), although we always download from the
// very same server... Maybe they limit the download rate per file, not per IP…?
object DownloadAndRead {

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
    // Beware: I’ve been banned for using a parallelism level of 8
    val downloadAndRead =
      new DownloadAndRead(
        AreaAndHour.all,
        parallelismLevel = 4,
        download(gribsDir, gfsRun, _),
        read(locationsByArea, gfsRun, _, _)
      )

    os.remove.all(gribsDir)
    os.makeDir.all(gribsDir)

    val eventuallyRead = downloadAndRead.start()

    // TEMP Simulate old soargfs script for downloading data
    // We can safely remove this line after we drop support for old soargfs
    downloadAndRead.eventuallyDownloaded
      .foreach(_ => writeFilesForOldSoargfs(gribsDir))

    Await.result(eventuallyRead, 10.hours)
  }

  // Download a GRIB file as a background task
  private def download(
    gribsDir: os.Path,
    gfsRun: GfsRun,
    areaAndHour: AreaAndHour
  ): Future[os.Path] =
    Future {
      concurrent.blocking {
        GribDownloader.download(gribsDir, gfsRun, areaAndHour)
      }
    }

  // Read the content of a GRIB file as a background task
  private def read(
    locationsByArea: Map[Area, Seq[Point]],
    gfsRun: GfsRun,
    gribFile: os.Path,
    areaAndHour: AreaAndHour
  ): Future[Map[Point, GfsForecast]] =
    Future {
      concurrent.blocking {
        val locations = locationsByArea(areaAndHour.area)
        GfsForecast.fromGribFile(gribFile, gfsRun.initDateTime, areaAndHour.hourOffset, locations)
      }
    }

  private def writeFilesForOldSoargfs(gribsDir: os.Path): Unit = {
    os.write(gribsDir / "aDone.txt", "")
    os.write(gribsDir / "bDone.txt", "")
    os.write(gribsDir / "cDone.txt", "")
  }

}

// To make it more efficient, we download up to `parallelismLevel`
// GRIB files in parallel, and we start reading each file as soon
// as it has been downloaded (even though other downloads may be
// performed in the background).
// Each file weighs a few MB, so it takes a few seconds to download
// it, and to read it from disk. To make things as efficient as
// possible, we perform a few downloads in parallel, and we read
// each file as soon as it has been downloaded.
// This class schedules the downloads and reads. It makes use of locks
// to make sure we process all the tasks exactly once.
/**
 * @param allTasks     The forecasts we want to process
 * @param parallelismLevel Parallelism level to use
 * @param download         The download task
 * @param read             The read task
 */
class DownloadAndRead private (
  allTasks: Seq[AreaAndHour],
  parallelismLevel: Int,
  download: AreaAndHour => Future[os.Path],
  read: (os.Path, AreaAndHour) => Future[Map[Point, GfsForecast]]
) {

  private val numberOfTasksToProcess = allTasks.size

  private var remainingTasks: List[AreaAndHour] =
    allTasks.view.drop(parallelismLevel).toList
  private var numberOfProcessedTasks: Int = 0
  private var processedForecasts: ForecastsByHour = Map.empty
  private val readPromise: Promise[ForecastsByHour] = Promise()
  private val downloadedPromise: Promise[Unit] = Promise()

  /**
   * Downloads and reads all the forecasts we are interested in.
   *
   * In case we fail to download or read any forecast, we return
   * a failed `Future`.
   */
  def start(): Future[Map[Int, Map[Point, GfsForecast]]] = {
    // We start the first tasks in parallel. As soon as
    // the download part of a task is finished, we start
    // the next one. Thus, we never download more than
    // `parallelismLevel` files in parallel.
    allTasks.take(parallelismLevel).foreach(startDownloadingOne)
    readPromise.future
  }

  /** Start downloading the forecast in the background */
  private def startDownloadingOne(areaAndHour: AreaAndHour): Unit = {
    download(areaAndHour).onComplete {
      case Failure(exception) => readPromise.tryFailure(exception)
      case Success(gribFile)  =>
        // Then read the relevant information from the file that
        // have been saved on disk
        startReadingOne(gribFile, areaAndHour)
        // And, in the meantime, see if there is another task
        // to process
        dequeue() match {
          case Some(task) => startDownloadingOne(task)
          case None       => downloadedPromise.trySuccess(())
        }
      }
  }

  /** Start reading the GRIB file in the background */
  private def startReadingOne(gribFile: os.Path, areaAndHour: AreaAndHour): Unit = {
    read(gribFile, areaAndHour).onComplete {
      case Failure(exception) => readPromise.tryFailure(exception)
      case Success(forecasts) => collect(forecasts, areaAndHour)
    }
  }

  /**
   * Remove the next task from the remaining task, if any.
   */
  private def dequeue(): Option[AreaAndHour] = this.synchronized {
    remainingTasks match {
      case Nil => None
      case head :: tail =>
        remainingTasks = tail
        Some(head)
    }
  }

  /**
   * Aggregate the forecast data for the given area and hour with
   * the other forecast data we previously read.
   *
   * Forecast data for the same hour is concatenated.
   *
   * If this is the last forecast to read, we signal that the
   * whole process is finished!
   */
  private def collect(forecast: Forecast, areaAndHour: AreaAndHour) = this.synchronized {
    numberOfProcessedTasks = numberOfProcessedTasks + 1
    processedForecasts = processedForecasts.updatedWith(areaAndHour.hourOffset) {
      case Some(previousForecast) => Some(previousForecast ++ forecast)
      case None => Some(forecast)
    }
    if (numberOfProcessedTasks == numberOfTasksToProcess) {
      readPromise.success(processedForecasts)
    }
  }

  def eventuallyDownloaded: Future[Unit] = downloadedPromise.future

}
