package org.soaringmeteo.gfs

import cats.syntax.apply._
import com.monovore.decline.{CommandApp, Opts}
import org.slf4j.LoggerFactory
import org.soaringmeteo.InitDateString
import org.soaringmeteo.PathArgument.pathArgument
import org.soaringmeteo.gfs.out.{Store, runTargetPath, versionedTargetPath}
import org.soaringmeteo.out.touchMarkerFile

import scala.concurrent.Await
import scala.concurrent.duration.DurationInt
import scala.util.control.NonFatal

object Main extends CommandApp(
  "soaringmeteo-gfs",
  "Download weather data from the GFS model, extract the relevant information for soaring pilots, and produce meteorological assets from it",
  main = {
    val gribsDir  = Opts.argument[os.Path]("GRIBs directory")
    val outputDir = Opts.argument[os.Path]("output directory")

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

    (gribsDir, outputDir, gfsRunInitTime, reusePreviousGribFiles).mapN(Soaringmeteo.run)
  }
)

object Soaringmeteo {
  private val logger = LoggerFactory.getLogger(getClass)

  def run(
    gribsDir: os.Path,
    outputDir: os.Path,
    maybeGfsRunInitTime: Option[String],
    reusePreviousGribFiles: Boolean
  ): Unit = {
    val exitStatus =
      try {
        val subgrids = Settings.gfsSubgrids
        val gfsRun = in.ForecastRun.findLatest(maybeGfsRunInitTime)
        if (!reusePreviousGribFiles) {
          logger.info("Removing old data")
          os.remove.all(gribsDir)
          deletePreviousStore()
          ()
        }
        Await.result(Store.ensureSchemaExists(), 30.seconds)
        val forecastGribsDir = gfsRun.storagePath(gribsDir)
        val versionedTargetDir = versionedTargetPath(outputDir)
        val runTargetDir = runTargetPath(versionedTargetDir, InitDateString(gfsRun.initDateTime))
        os.makeDir.all(runTargetDir)
        DataPipeline(forecastGribsDir, runTargetDir, gfsRun, subgrids, reusePreviousGribFiles)
        JsonWriter.writeJsons(versionedTargetDir, gfsRun)
        touchMarkerFile(outputDir)
        logger.info("Done")
        0
      } catch {
        case NonFatal(error) =>
          logger.error("Failed to run soaringmeteo-gfs", error)
          1
      } finally {
        Store.close()
      }
    System.exit(exitStatus)
  }

  def deletePreviousStore(): Unit = {
    os.remove(os.pwd / "data.mv.db", checkExists = false)
  }

}
