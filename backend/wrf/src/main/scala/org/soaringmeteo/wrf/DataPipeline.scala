package org.soaringmeteo.wrf

import cats.data.NonEmptyList
import geotrellis.vector.Extent
import org.slf4j.LoggerFactory
import org.soaringmeteo.InitDateString
import org.soaringmeteo.out.{ForecastMetadata, Raster, VectorTiles}

import java.time.OffsetDateTime

object DataPipeline {

  private val logger = LoggerFactory.getLogger(getClass)

  def run(
    inputFiles: NonEmptyList[os.Path],
    modelTargetDir: os.Path,
    initDateTime: OffsetDateTime,
    firstTimeStep: OffsetDateTime,
  ): Unit = {
    val initDateString = InitDateString(initDateTime)
    // Output directory of the current forecast run
    val runTargetDir = modelTargetDir / initDateString

    val results =
      for (inputFile <- inputFiles) yield {
        logger.info(s"Processing file ${inputFile}")
        val grid = Grid.find(inputFile)
        val domainOutputDir = runTargetDir / grid.outputPath
        val netCdfResults = processFile(inputFile, domainOutputDir)
        (grid, netCdfResults.latestHourOffset, netCdfResults.rasterExtent, netCdfResults.vectorTilesParameters)
      }

    overwriteLatestForecastMetadata(
      modelTargetDir,
      initDateString,
      initDateTime,
      firstTimeStep,
      results.toList
    )
  }

  private def processFile(inputFile: os.Path, outputDir: os.Path): NetCdf.Result = {
    val result = NetCdf.read(inputFile)
    generateRasterImagesAndVectorTiles(outputDir, result)
    generateLocationForecasts()
    result
  }

  private def generateRasterImagesAndVectorTiles(
    outputDir: os.Path,
    netCdfResult: NetCdf.Result,
  ): Unit = {
    val forecastsByHour = netCdfResult.forecastsByHour
    for ((forecasts, t) <- forecastsByHour.zipWithIndex) {
      Raster.writeAllPngFiles(netCdfResult.width, netCdfResult.height, outputDir, t, forecasts)
      VectorTiles.writeAllVectorTiles(netCdfResult.vectorTilesParameters, outputDir, t, forecasts)
    }
  }

  private def generateLocationForecasts(): Unit = {
    // TODO
  }

  private def overwriteLatestForecastMetadata(
    outputDir: os.Path,
    initDateString: String,
    initializationDate: OffsetDateTime,
    firstTimeStep: OffsetDateTime,
    results: Seq[(Grid, Int, Extent, VectorTiles.Parameters)]
  ): Unit = {
    logger.info(s"Writing forecast metadata in ${outputDir}")
    val latestHourOffset = results.head._2 // Assume all the grids have the same time-steps
    val zones =
      for ((grid, _, rasterExtent, vectorTilesParameters) <- results) yield {
        ForecastMetadata.Zone(
          grid.outputPath,
          grid.label,
          ForecastMetadata.Raster(
            projection = "WRF",
            rasterExtent
          ),
          ForecastMetadata.VectorTiles(vectorTilesParameters)
        )
      }
    ForecastMetadata.overwriteLatestForecastMetadata(
      outputDir,
      history = 4 /* days */,
      initDateString,
      initializationDate,
      Some(firstTimeStep),
      latestHourOffset,
      zones
    )
  }

}
