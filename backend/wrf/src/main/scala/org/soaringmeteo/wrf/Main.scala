package org.soaringmeteo.wrf

import cats.data.NonEmptyList
import cats.syntax.apply._
import com.monovore.decline.time.defaultOffsetDateTime
import com.monovore.decline.{CommandApp, Opts}
import org.slf4j.LoggerFactory
import org.soaringmeteo.PathArgument.pathArgument

import java.time.OffsetDateTime
import scala.util.control.NonFatal

object Main extends CommandApp(
  "soaringmeteo-wrf",
  "Transform the results of the WRF model into meteorological assets",
  main = {
    val outputDir     = Opts.argument[os.Path]("output directory")
    val initTime      = Opts.argument[OffsetDateTime]("run initialization time")
    val firstTimeStep = Opts.argument[OffsetDateTime]("time of the forecast first time-step")
    val inputFiles    = Opts.arguments[os.Path]("input files")

    (outputDir, initTime, firstTimeStep, inputFiles).mapN(Program.run)
  }
)

object Program {

  private val logger = LoggerFactory.getLogger(getClass)
  def run(
    outputDir: os.Path,
    initializationDate: OffsetDateTime,
    firstTimeStep: OffsetDateTime,
    inputFiles: NonEmptyList[os.Path],
  ): Unit = {
    val exitStatus =
      try {
        DataPipeline.run(
          inputFiles,
          outputDir,
          initializationDate,
          firstTimeStep
        )
        logger.info("Done")
        0
      } catch {
        case NonFatal(error) =>
          logger.error("Failed to run soaringmeteo-wrf", error)
          1
      }
    System.exit(exitStatus)
  }

}
