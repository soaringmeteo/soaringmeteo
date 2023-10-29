package org.soaringmeteo.gfs.out

import geotrellis.raster.render.png.{GreyaPngEncoding, PngColorEncoding, RgbPngEncoding, RgbaPngEncoding}
import geotrellis.raster.{DoubleArrayTile, IntArrayTile, Tile}
import geotrellis.raster.render.{ColorMap, Png}
import org.slf4j.LoggerFactory
import org.soaringmeteo.gfs.Subgrid

/**
 * Output of the model encoded as a raster image.
 */
trait Raster {
  def toPng(subgrid: Subgrid, forecasts: IndexedSeq[IndexedSeq[Forecast]]): Png

  /** Path prefix unique to this variable */
  def path: String
}

object Raster {

  val logger = LoggerFactory.getLogger(getClass)

  def apply(path: String, extractor: DataExtractor, colorMap: ColorMap, pngColorEncoding: PngColorEncoding): Raster = {
    val pathArgument = path
    new Raster {
      def path: String = pathArgument
      def toPng(subgrid: Subgrid, forecasts: IndexedSeq[IndexedSeq[Forecast]]): Png = {
        val height = subgrid.height
        val width = subgrid.width
        val pixels =
          for {
            y <- 0 until height
            x <- 0 until width
          } yield {
            extractor.extract(forecasts(x)(y))
          }
        val tile = extractor.makeTile(pixels, width, height)
        colorMap
          .render(tile)
          .renderPng(pngColorEncoding)
      }
    }
  }

  def writeAllPngFiles(
    subgrid: Subgrid,
    subgridTargetDir: os.Path,
    hourOffset: Int,
    forecasts: IndexedSeq[IndexedSeq[Forecast]]
  ): Unit = {
    logger.debug(s"Generating images for hour offset n°${hourOffset}")
    for (raster <- gfsRasters) {
      val fileName = s"${hourOffset}.png" // e.g., "3.png", "6.png", etc.
      val path = subgridTargetDir / raster.path / fileName
      logger.trace(s"Generating image ${path}")
      os.write.over(
        path,
        raster.toPng(subgrid, forecasts).bytes,
        createFolders = true
      )
    }
  }

  val gfsRasters: List[Raster] = List(
    // XC Flying potential
    Raster(
      "xc-potential",
      intData(_.xcFlyingPotential),
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
      ),
      RgbPngEncoding
    ),
    // Thermals
    Raster(
      "soaring-layer-depth",
      intData(_.soaringLayerDepth.toMeters.round.intValue),
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
      ).withFallbackColor(0xffffff),
      RgbPngEncoding
    ),
    Raster(
      "thermal-velocity",
      doubleData(_.thermalVelocity.toMetersPerSecond),
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
      ).withFallbackColor(0xffffff),
      RgbPngEncoding
    ),
    // Clouds and Rain
    Raster(
      "cloud-cover",
      intData(_.totalCloudCover),
      ColorMap(
        20  -> 0x00000000,
        40  -> 0x0000003f,
        60  -> 0x0000007f,
        80  -> 0x000000bf,
        100 -> 0x000000ff
      ),
      GreyaPngEncoding // FIXME Make it just Gray and handle transparency on the client-side
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
    Raster(
      "rain",
      intData(_.totalRain.toMillimeters.round.toInt),
      ColorMap(
        1  -> 0x0000ff00,
        3  -> 0x0000ff55,
        7  -> 0x0000ffb3,
        10 -> 0x0000ffff
      ).withFallbackColor(0x0000ffff),
      RgbaPngEncoding
    )
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
