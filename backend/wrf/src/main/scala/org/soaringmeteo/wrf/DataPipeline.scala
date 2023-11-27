package org.soaringmeteo.wrf

import cats.data.NonEmptyList
import org.slf4j.LoggerFactory
import org.soaringmeteo.InitDateString
import org.soaringmeteo.out.{ForecastMetadata, JsonData, Raster, VectorTiles, deleteOldData}

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

    // Process all the input files (grids) one by one
    val results =
      for (inputFile <- inputFiles) yield {
        logger.info(s"Processing file ${inputFile}")
        val grid = Grid.find(inputFile)
        val metadata = processFile(inputFile, grid, runTargetDir)
        (grid, metadata)
      }

    // Ultimately, write the forecast metadata for the run and delete old data
    overwriteLatestForecastMetadata(
      modelTargetDir,
      initDateString,
      initDateTime,
      firstTimeStep,
      results.toList
    )

    deleteOldData(modelTargetDir, initDateTime.minusDays(4))
  }

  private def processFile(inputFile: os.Path, grid: Grid, runTargetDir: os.Path): NetCdf.Metadata = {
    val gridOutputDir = runTargetDir / grid.outputPath
    val result = NetCdf.read(inputFile)
    generateRasterImagesAndVectorTiles(gridOutputDir, result)
    generateLocationForecasts(gridOutputDir, grid.outputPath, result)
    result.metadata
  }

  private def generateRasterImagesAndVectorTiles(
    outputDir: os.Path,
    netCdfResult: NetCdf.Result,
  ): Unit = {
    logger.info(s"Generating raster images and vector tiles")
    val forecastsByHour = netCdfResult.forecastsByHour
    for ((forecasts, t) <- forecastsByHour.zipWithIndex) {
      Raster.writeAllPngFiles(netCdfResult.metadata.width, netCdfResult.metadata.height, outputDir, t, forecasts)
      VectorTiles.writeAllVectorTiles(netCdfResult.metadata.vectorTilesParameters, outputDir, t, forecasts)
    }
  }

  private def generateLocationForecasts(
    outputDir: os.Path,
    gridName: String,
    result: NetCdf.Result,
  ): Unit = {
    JsonData.writeForecastsByLocation(
      gridName,
      result.metadata.width,
      result.metadata.height,
      outputDir
    ) { (x, y) =>
      result.forecastsByHour.zipWithIndex
        .map { case (forecasts, timeStep) => (timeStep, forecasts(x)(y)) }
        .toMap
    }
  }

  private def overwriteLatestForecastMetadata(
    outputDir: os.Path,
    initDateString: String,
    initializationDate: OffsetDateTime,
    firstTimeStep: OffsetDateTime,
    results: Seq[(Grid, NetCdf.Metadata)]
  ): Unit = {
    logger.info(s"Writing forecast metadata in ${outputDir}")
    val latestHourOffset = results.head._2.latestHourOffset // Assume all the grids have the same time-steps
    val zones =
      for ((grid, metadata) <- results) yield {
        val (rasterResolution, rasterExtent) = metadata.raster
        ForecastMetadata.Zone(
          grid.outputPath,
          grid.label,
          ForecastMetadata.Raster(
            projection = "WRF",
            rasterResolution,
            rasterExtent
          ),
          ForecastMetadata.VectorTiles(metadata.vectorTilesParameters, grid.vectorTileSize)
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
