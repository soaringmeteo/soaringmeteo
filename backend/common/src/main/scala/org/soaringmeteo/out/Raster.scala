package org.soaringmeteo.out

import geotrellis.proj4.CRS
import geotrellis.raster.{DoubleArrayTile, FloatArrayTile, FloatCellType, IntArrayTile, Tile}
import geotrellis.raster.io.geotiff.{GeoTiffOptions, SinglebandGeoTiff, Tags, Tiled}
import geotrellis.raster.io.geotiff.compression.DeflateCompression
import geotrellis.raster.resample.NearestNeighbor
import geotrellis.vector.Extent
import org.slf4j.LoggerFactory
import org.soaringmeteo.Forecast

/**
 * Output of the model encoded as a raster image (Cloud-Optimized GeoTIFF).
 */
trait Raster {
  /** Build a raw data tile from the forecast grid */
  def makeTile(width: Int, height: Int, forecasts: IndexedSeq[IndexedSeq[Forecast]]): Tile

  /** Path prefix unique to this variable */
  def path: String
}

object Raster {

  private val logger = LoggerFactory.getLogger(getClass)

  def apply(path: String, extractor: DataExtractor): Raster = {
    val pathArgument = path
    new Raster {
      def path: String = pathArgument
      def makeTile(width: Int, height: Int, forecasts: IndexedSeq[IndexedSeq[Forecast]]): Tile = {
        val pixels =
          for {
            y <- 0 until height
            x <- 0 until width
          } yield {
            extractor.extract(forecasts(x)(y))
          }
        extractor.makeTile(pixels, width, height)
      }
    }
  }

  private val cogOptions = GeoTiffOptions(
    storageMethod = Tiled(256, 256),
    compression = DeflateCompression
  )

  def writeAllCogFiles(
    width: Int,
    height: Int,
    extent: Extent,
    crs: CRS,
    targetDir: os.Path,
    hourOffset: Int,
    forecasts: IndexedSeq[IndexedSeq[Forecast]]
  ): Unit = {
    logger.debug(s"Generating COG images for hour offset n°${hourOffset}")
    for (raster <- gfsRasters) {
      val fileName = s"${hourOffset}.tif"
      val path = targetDir / raster.path / fileName
      logger.trace(s"Generating COG image ${path}")
      val tile = raster.makeTile(width, height, forecasts)
      val geotiff = SinglebandGeoTiff(tile, extent, crs, Tags.empty, cogOptions, overviews = Nil)
      val withOverviews = geotiff.withOverviews(NearestNeighbor, decimations = Nil, blockSize = 256)
      val bytes = withOverviews.toCloudOptimizedByteArray
      os.write.over(
        path,
        bytes,
        createFolders = true
      )
    }
  }

  val gfsRasters: List[Raster] = List(
    // XC Flying potential (integer 0–100)
    Raster(
      "xc-potential",
      intData(_.xcFlyingPotential)
    ),
    // Soaring layer depth (integer, meters)
    Raster(
      "soaring-layer-depth",
      intData(_.soaringLayerDepth.toMeters.round.intValue)
    ),
    // Thermal velocity (double, m/s)
    Raster(
      "thermal-velocity",
      doubleData(_.thermalVelocity.toMetersPerSecond)
    ),
    // Clouds and Rain (double, encoded: cloud cover 0–100, rain = value + 100)
    Raster(
      "clouds-rain",
      doubleData { forecast =>
        val rain = forecast.totalRain.toMillimeters
        if (rain >= 0.2) {
          rain + 100
        } else {
          forecast.totalCloudCover.toDouble
        }
      }
    ),
    // Cumulus depth (integer, meters; 0 means no cumulus)
    Raster(
      "cumulus-depth",
      intData(_.convectiveClouds.fold(0)(clouds => (clouds.top - clouds.bottom).toMeters.round.toInt))
    ),
  )

  /** Abstract over the type of data extracted from the forecast */
  trait DataExtractor {
    type Data

    def extract(forecast: Forecast): Data

    /**
     * @param arrayData Flat array of data points that is expected to be already ordered
     *                  according to the tile dimension (from top to bottom and left to right)
     */
    def makeTile(arrayData: Seq[Data], width: Int, height: Int): Tile
  }

  def intData(extract: Forecast => Int): DataExtractor = {
    val extractArgument = extract
    new DataExtractor {
      type Data = Int
      def extract(forecast: Forecast): Int = extractArgument(forecast)
      def makeTile(arrayData: Seq[Int], width: Int, height: Int): Tile =
        FloatArrayTile(arrayData.map(_.toFloat).toArray, width, height, FloatCellType)
    }
  }

  def doubleData(extract: Forecast => Double): DataExtractor = {
    val extractArgument = extract
    new DataExtractor {
      type Data = Double
      def extract(forecast: Forecast): Double = extractArgument(forecast)
      def makeTile(arrayData: Seq[Double], width: Int, height: Int): Tile =
        FloatArrayTile(arrayData.map(_.toFloat).toArray, width, height, FloatCellType)
    }
  }

}
