package org.soaringmeteo.gfs

import java.util.concurrent.Executors
import org.slf4j.LoggerFactory
import org.soaringmeteo.Forecast
import org.soaringmeteo.gfs.in.GfsGrib
import org.soaringmeteo.gfs.out.{Store, subgridTargetPath}
import org.soaringmeteo.out.{Raster, VectorTiles}
import org.soaringmeteo.util.{WorkReporter, daemonicThreadFactory}

import scala.concurrent.{Await, ExecutionContext, Future}
import scala.concurrent.duration.DurationInt
import scala.util.chaining.scalaUtilChainingOps

/**
 * Defines the whole process of downloading the input data from remote servers
 * (or from the filesystem, if we reuse data previously downloaded), loading
 * the relevant information into memory, generating raster images and vector
 * tiles, and saving the data onto the disk storage to group them by location
 * later.
 *
 * We try to parallelize things as much as possible, depending on constraints
 * such as thread-safety, download limit rate, etc.
 */
object DataPipeline {

  private val logger = LoggerFactory.getLogger(getClass)

  /**
   * Downloads GRIB files from GFS forecast, read relevant data from
   * them, generate raster images and vector tiles, and write the data
   * onto the disk storage.
   * @return For each hour after initialization time we are interested
   *         in (see [[Settings.forecastHours]]), the forecast data
   *         for all the subgrids we are interested in.
   * @param gribsDir        Directory where GRIB files will be saved.
   *                        Note that the content of the directory will
   *                        be completely replaced.
   * @param gfsRun          The GFS run to download
   * @param reusePreviousGribFiles Whether to reuse the previously downloaded GRIB
   *                               files (for the given `gfsRun`) instead of
   *                               downloading them again.
   */
  def apply(
    gribsDir: os.Path,
    runTargetDir: os.Path,
    gfsRun: in.ForecastRun,
    subgrids: Seq[Subgrid],
    reusePreviousGribFiles: Boolean
  ): Unit = {
    os.makeDir.all(gribsDir)

    // We use the following thread-pool to manage the execution of the
    // tasks that read the forecast data from disk. This task uses
    // the grib library, which is not thread-safe, hence parallelism = 1.
    val readingGribFiles = ExecutionContext.fromExecutorService(Executors.newSingleThreadExecutor(daemonicThreadFactory))
    val generatingSubgridResults = ExecutionContext.fromExecutorService(Executors.newSingleThreadExecutor(daemonicThreadFactory))

    val gribDownloader = new GribDownloader

    val hourOffsetsAndSubgrids =
      Settings.forecastHours.flatMap(t => subgrids.map(grid => (t, grid)))
    // Total number of files to download and then load into memory
    val pipelineCount = hourOffsetsAndSubgrids.size
    logger.info(
      s"""Processing ${subgrids.size} subgrids over ${Settings.forecastHours.size} time-steps (${pipelineCount} pipelines):
         |${subgrids.map(subgrid => s" - ${subgrid.id}: ${subgrid.width}×${subgrid.height} (${subgrid.size} points)").mkString("\n")}""".stripMargin
    )

    // Reports the progression of downloads
    val downloadReporter = new WorkReporter(pipelineCount, "Downloading forecast data", logger)
    // Reports the progression of loading into memory
    val readReporter = new WorkReporter(pipelineCount, "Reading data from grib files", logger)
    val subgridResultsReporter = new WorkReporter(pipelineCount, "Generating raster images and vector tiles", logger)
    val persistReporter = new WorkReporter(pipelineCount, "Persisting forecast data", logger)

    // Download a GRIB file as a background task
    def download(hourOffset: Int, subgrid: Subgrid): Future[os.Path] = {
      val gribFile = gribsDir / gfsRun.fileName(hourOffset, subgrid)
      if (reusePreviousGribFiles && os.exists(gribFile)) {
        logger.info(s"Not downloading forecast ${subgrid.id}-${hourOffset} because $gribFile already exists")
        Future.successful(gribFile)
      } else {
        gribDownloader.scheduleDownload(gribFile, gfsRun, hourOffset, subgrid)
      }
    }.tap(_.foreach(_ => downloadReporter.notifyCompleted())(ExecutionContext.global))

    // Read the content of a GRIB file as a background task
    def read(subgrid: Subgrid, gribFile: os.Path, hourOffset: Int): Future[IndexedSeq[IndexedSeq[Forecast]]] = {
      Future {
        concurrent.blocking {
          logger.debug(s"Reading file $gribFile")
          GfsGrib.fromGribFile(gribFile, gfsRun.initDateTime, hourOffset, subgrid)
        }
      }(readingGribFiles /* Make sure we don't read multiple GRIB files in parallel */)
    }.tap(_.foreach(_ => readReporter.notifyCompleted())(ExecutionContext.global))

    def generateSubgridResultsAndSave(subgrid: Subgrid, hourOffset: Int, forecasts: IndexedSeq[IndexedSeq[Forecast]], runTargetDir: os.Path): Future[Unit] = {
      val eventuallyGenerated = generateSubgridResults(subgrid, hourOffset, forecasts)
      val eventuallySaved     = save(subgrid, hourOffset, forecasts)
      eventuallyGenerated.zip(eventuallySaved)
        .map(_ => ())(ExecutionContext.global)
    }

    def generateSubgridResults(subgrid: Subgrid, hourOffset: Int, forecasts: IndexedSeq[IndexedSeq[Forecast]]): Future[Unit] = {
      Future {
        // We create one PNG file per forecast time and per output variable (e.g., `2021-01-08T12/europe-africa/soaring-layer-depth/0.png`,
        // `2021-01-08T12/america/wind-300m-agl/3.png`, etc.).
        // Each file contains the forecast for that parameter (soaring layer depth, wind, etc.) within the subgrid
        val subgridTargetDir = subgridTargetPath(runTargetDir, subgrid)
        Raster.writeAllPngFiles(subgrid.width, subgrid.height, subgridTargetDir, hourOffset, forecasts)
        VectorTiles.writeAllVectorTiles(subgrid.vectorTilesParameters, subgridTargetDir, hourOffset, forecasts)
      }(generatingSubgridResults)
    }.tap(_.foreach(_ => subgridResultsReporter.notifyCompleted())(ExecutionContext.global))

    def save(subgrid: Subgrid, hourOffset: Int, forecasts: IndexedSeq[IndexedSeq[Forecast]]) = {
      Store.save(gfsRun.initDateTime, subgrid, hourOffset, forecasts)
        .tap(_.foreach(_ => persistReporter.notifyCompleted())(ExecutionContext.global))
    }

    val eventualForecast = locally {
      // For all the other cases, we just use the default execution context
      import scala.concurrent.ExecutionContext.Implicits.global

      def dataPipeline(hourOffset: Int, subgrid: Subgrid): Future[Unit] =
        for {
          alreadySaved <-
            if (reusePreviousGribFiles) Store.exists(gfsRun.initDateTime, subgrid, hourOffset)
            else Future.successful(false)
          _ <-
            if (alreadySaved) {
              logger.info(s"Not downloading forecast ${subgrid.id}-${hourOffset} because the data has already been stored locally")
              Future.successful(())
            } else {
              for {
                gribFile  <- download(hourOffset, subgrid)
                forecasts <- read(subgrid, gribFile, hourOffset)
                _ <- generateSubgridResultsAndSave(subgrid, hourOffset, forecasts, runTargetDir)
              } yield ()
            }
        } yield ()

      for {
        _ <-
          Future.traverse(hourOffsetsAndSubgrids) { case (hourOffset, subgrid) =>
            dataPipeline(hourOffset, subgrid)
          }
      } yield ()
    }

    Await.result(eventualForecast, 8.hours)
  }

}
