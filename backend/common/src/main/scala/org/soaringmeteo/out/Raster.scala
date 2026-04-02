package org.soaringmeteo.out

import geotrellis.raster.render.png.{GreyaPngEncoding, PngColorEncoding, RgbPngEncoding, RgbaPngEncoding}
import geotrellis.raster.{DoubleArrayTile, IntArrayTile, Tile}
import geotrellis.raster.render.{ColorMap, LessThan, Png}
import org.slf4j.LoggerFactory
import org.soaringmeteo.Forecast

/**
 * Output of the model encoded as a raster image.
 */
trait Raster {
  def toPng(width: Int, height: Int, forecasts: IndexedSeq[IndexedSeq[Forecast]]): Png

  /** Path prefix unique to this variable */
  def path: String
}

object Raster {

  private val logger = LoggerFactory.getLogger(getClass)

  private val defaultXcPotentialColorMap: ColorMap =
    ColorMap(
      10  -> 0x333333,
      20  -> 0x990099,
      30  -> 0xff0000,
      40  -> 0xff9900,
      50  -> 0xffcc00,
      60  -> 0xffff00,
      70  -> 0x66ff00,
      80  -> 0x00ffff,
      90  -> 0x99ffff,
      100 -> 0xffffff
    )

  private val daltonianXcPotentialColorMap: ColorMap =
    ColorMap(
      10  -> 0x333333,
      20  -> 0x7a1fa2,
      30  -> 0xd73027,
      40  -> 0xf46d43,
      50  -> 0xfdae61,
      60  -> 0xffffbf,
      70  -> 0xa6d96a,
      80  -> 0x66c2a5,
      90  -> 0x3288bd,
      100 -> 0xffffff
    )

  private val defaultSoaringLayerDepthColorMap: ColorMap =
    ColorMap(
      250  -> 0x333333,
      500  -> 0x990099,
      750  -> 0xff0000,
      1000 -> 0xff9900,
      1250 -> 0xffcc00,
      1500 -> 0xffff00,
      1750 -> 0x66ff00,
      2000 -> 0x00ffff,
      2250 -> 0x99ffff,
      2500 -> 0xffffff
    ).withFallbackColor(0xffffff)

  private val daltonianSoaringLayerDepthColorMap: ColorMap =
    ColorMap(
      250  -> 0x333333,
      500  -> 0x7a1fa2,
      750  -> 0xd73027,
      1000 -> 0xf46d43,
      1250 -> 0xfdae61,
      1500 -> 0xffffbf,
      1750 -> 0xa6d96a,
      2000 -> 0x66c2a5,
      2250 -> 0x3288bd,
      2500 -> 0xffffff
    ).withFallbackColor(0xffffff)

  private val defaultThermalVelocityColorMap: ColorMap =
    ColorMap(
      0.25 -> 0x333333,
      0.50 -> 0x990099,
      0.75 -> 0xff0000,
      1.00 -> 0xff9900,
      1.25 -> 0xffcc00,
      1.50 -> 0xffff00,
      1.75 -> 0x66ff00,
      2.00 -> 0x00ffff,
      2.50 -> 0x99ffff,
      3.00 -> 0xffffff
    ).withFallbackColor(0xffffff)

  private val daltonianThermalVelocityColorMap: ColorMap =
    ColorMap(
      0.25 -> 0x333333,
      0.50 -> 0x7a1fa2,
      0.75 -> 0xd73027,
      1.00 -> 0xf46d43,
      1.25 -> 0xfdae61,
      1.50 -> 0xffffbf,
      1.75 -> 0xa6d96a,
      2.00 -> 0x66c2a5,
      2.50 -> 0x3288bd,
      3.00 -> 0xffffff
    ).withFallbackColor(0xffffff)

  def apply(path: String, extractor: DataExtractor, colorMap: ColorMap, pngColorEncoding: PngColorEncoding): Raster = {
    val pathArgument = path
    new Raster {
      def path: String = pathArgument
      def toPng(width: Int, height: Int, forecasts: IndexedSeq[IndexedSeq[Forecast]]): Png = {
        val pixels =
          for {
            y <- 0 until height
            x <- 0 until width
          } yield {
            extractor.extract(forecasts(x)(y))
          }
        val tile = extractor.makeTile(pixels, width, height)
        colorMap
          .withBoundaryType(LessThan)
          .render(tile)
          .renderPng(pngColorEncoding)
      }
    }
  }

  def writeAllPngFiles(
    width: Int,
    height: Int,
    targetDir: os.Path,
    hourOffset: Int,
    forecasts: IndexedSeq[IndexedSeq[Forecast]]
  ): Unit = {
    logger.debug(s"Generating images for hour offset n°${hourOffset}")
    for (raster <- gfsRasters) {
      val fileName = s"${hourOffset}.png" // e.g., "3.png", "6.png", etc.
      val path = targetDir / raster.path / fileName
      logger.trace(s"Generating image ${path}")
      os.write.over(
        path,
        raster.toPng(width, height, forecasts).bytes,
        createFolders = true
      )
    }
  }

  val gfsRasters: List[Raster] = List(
    // XC Flying potential
    Raster(
      "xc-potential",
      intData(_.xcFlyingPotential),
      defaultXcPotentialColorMap,
      RgbPngEncoding
    ),
    Raster(
      "xc-potential-daltonian",
      intData(_.xcFlyingPotential),
      daltonianXcPotentialColorMap,
      RgbPngEncoding
    ),
    // Thermals
    Raster(
      "soaring-layer-depth",
      intData(_.soaringLayerDepth.toMeters.round.intValue),
      defaultSoaringLayerDepthColorMap,
      RgbPngEncoding
    ),
    Raster(
      "soaring-layer-depth-daltonian",
      intData(_.soaringLayerDepth.toMeters.round.intValue),
      daltonianSoaringLayerDepthColorMap,
      RgbPngEncoding
    ),
    Raster(
      "thermal-velocity",
      doubleData(_.thermalVelocity.toMetersPerSecond),
      defaultThermalVelocityColorMap,
      RgbPngEncoding
    ),
    Raster(
      "thermal-velocity-daltonian",
      doubleData(_.thermalVelocity.toMetersPerSecond),
      daltonianThermalVelocityColorMap,
      RgbPngEncoding
    ),
    // Clouds and Rain
    Raster(
      "clouds-rain",
      doubleData { forecast =>
        val rain = forecast.totalRain.toMillimeters
        if (rain >= 0.2) {
          rain + 100
        } else {
          forecast.totalCloudCover.toDouble
        }
      },
      ColorMap(
        // Clouds
        5.0    -> 0xffffff00,
        20.0   -> 0xffffffff,
        40.0   -> 0xbdbdbdff,
        60.0   -> 0x888888ff,
        80.0   -> 0x4d4d4dff,
        100.2  -> 0x111111ff, // we don’t show the rain unless it is higher than 0.2 millimeters
        // Rain
        101.0  -> 0x9df8f6ff,
        102.0  -> 0x0000ffff,
        104.0  -> 0x2a933bff,
        106.0  -> 0x49ff36ff,
        1010.0 -> 0xfcff2dff,
        1020.0 -> 0xfaca1eff,
        1030.0 -> 0xf87c00ff,
        1050.0 -> 0xf70c00ff,
        1100.0 -> 0xac00dbff,
      ).withFallbackColor(0xac00dbff),
      RgbaPngEncoding
    ),
    Raster(
      "cumulus-depth",
      intData(_.convectiveClouds.fold(0)(clouds => (clouds.top - clouds.bottom).toMeters.round.toInt)),
      ColorMap(
        50   -> 0xffffff00,
        400  -> 0xffffff7f,
        800  -> 0xffffffff,
        1500 -> 0xffff00ff,
        3000 -> 0xff0000ff
      ).withFallbackColor(0xff0000ff),
      RgbaPngEncoding
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
        IntArrayTile(arrayData.toArray, width, height)
    }
  }

  def doubleData(extract: Forecast => Double): DataExtractor = {
    val extractArgument = extract
    new DataExtractor {
      type Data = Double
      def extract(forecast: Forecast): Double = extractArgument(forecast)
      def makeTile(arrayData: Seq[Double], width: Int, height: Int): Tile =
        DoubleArrayTile(arrayData.toArray, width, height)
    }
  }

}
