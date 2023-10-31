package org.soaringmeteo.out

import geotrellis.proj4.{LatLng, WebMercator}
import geotrellis.vector.Extent
import geotrellis.vector.reproject.Reproject
import io.circe.Json
import org.slf4j.LoggerFactory
import org.soaringmeteo.{Forecast, Point, Wind}

/** Output of the model encoded as vector tiles */
case class VectorTiles(path: String, feature: (Point, Forecast) => Json)

object VectorTiles {

  private val logger = LoggerFactory.getLogger(getClass)

  /**
   * Parameters for generating the vector tiles.
   * @param extent      Bounding box of all the features. Coordinates must be in EPSG:3857 projection.
   * @param maxViewZoom The value of view zoom where all the points of the grids should be displayed
   * @param width       Grid width
   * @param height      Grid height
   * @param gridCoordinates Coordinates (EPSG:4326) of all the grid points
   */
  case class Parameters(
    extent: Extent,
    maxViewZoom: Int,
    width: Int,
    height: Int,
    gridCoordinates: IndexedSeq[IndexedSeq[Point]]
  ) {

    val (minViewZoom: Int, zoomLevels: Int) = {
      // Vector tiles partition the extent into multiple tiles. At the zoom level 0, there is
      // just one tile that covers the whole extent. At zoom level 1, there are 4 tiles, at
      // zoom level 2 there are 16 tiles, and so on.
      // OpenLayers assumes that 1 tile covers an area of 512 px on the map. So, if the projection
      // of the extent is larger than 512 px, OpenLayers will try to “zoom” into the tiles to find
      // only the points that are visible in the current view.
      // We find that rendering at most 15 wind arrow per tile looks good, so we make sure that
      // our tiles don’t contain more points than that. We down-sample the grid by removing every
      // other point from the previous zoom level.
      val threshold = 15 // Increase this value to show denser wind arrows
      var zoomLevelsValue = 1
      var maxPoints = math.max(width, height)
      while (maxPoints > threshold) {
        maxPoints = maxPoints / 2
        zoomLevelsValue = zoomLevelsValue + 1
      }
      // The minimal zoom level of the tiles is always 0, but here we define the minimal
      // zoom level of the view. It means that there is no point in trying to show the
      // wind arrows when the view zoom level is below that value, because the information
      // would be too small.
      val minViewZoomValue = math.max(maxViewZoom - zoomLevelsValue + 1, 0)
      (minViewZoomValue, zoomLevelsValue)
    }

  }

  def windFeature(wind: Forecast => Wind): (Point, Forecast) => Json = { (point, forecast) =>
    val value = wind(forecast)
    val speed = value.speed.toKilometersPerHour.round.intValue // km/h
    val direction = value.direction
    Json.obj(
      "type" -> Json.fromString("Feature"),
      "geometry" -> Json.obj(
        "type" -> Json.fromString("Point"),
        "coordinates" -> Json.arr(Json.fromBigDecimal(point.longitude), Json.fromBigDecimal(point.latitude))
      ),
      "properties" -> Json.obj(
        "speed" -> Json.fromInt(speed),
        "direction" -> Json.fromBigDecimal(direction)
      )
    )
  }

  val allVectorTiles = List(
    VectorTiles("wind-surface", windFeature(_.surfaceWind)),
    VectorTiles("wind-boundary-layer", windFeature(_.boundaryLayerWind)),
    VectorTiles("wind-soaring-layer-top", windFeature(_.winds.soaringLayerTop)),
    VectorTiles("wind-300m-agl", windFeature(_.winds.`300m AGL`)),
    VectorTiles("wind-2000m-amsl", windFeature(_.winds.`2000m AMSL`)),
    VectorTiles("wind-3000m-amsl", windFeature(_.winds.`3000m AMSL`)),
    VectorTiles("wind-4000m-amsl", windFeature(_.winds.`4000m AMSL`))
  )

  // Cache the projection of the coordinates from LatLng to WebMercator
  private val coordinatesCache =
    collection.concurrent.TrieMap.empty[Point, (Double, Double)]

  def writeVectorTiles(
    vectorTiles: VectorTiles,
    targetDir: os.Path,
    parameters: Parameters,
    forecasts: IndexedSeq[IndexedSeq[Forecast]]
  ): Unit = {
    val boundingBox = parameters.extent
    val zoomLevels = parameters.zoomLevels
    val maxZoom = zoomLevels - 1

    val size = boundingBox.maxExtent
    // Cache the computed features at their (longitude, latitude) coordinates
    val featuresCache = collection.concurrent.TrieMap.empty[Point, Json]

    for (z <- 0 to maxZoom) {
      // Show all the points at the highest zoom level only,
      // otherwise show every other point from the previous zoom level
      val step = 1 << (maxZoom - z)
      logger.trace(s"Generating tiles for zoom level ${z} (step = ${step}).")
      val visiblePoints = for {
        x <- 0 until parameters.width by step
        y <- 0 until parameters.height by step
      } yield (parameters.gridCoordinates(x)(y), forecasts(x)(y))

      val tiles =
        visiblePoints
          // Partition the visible points by tile
          .groupBy { case (point, _) =>
            // Compute the (x, y) tile coordinates this (lon, lat) point belongs too
            val (webMercatorX, webMercatorY) =
              coordinatesCache.getOrElseUpdate(
                point,
                Reproject((point.longitude.doubleValue, point.latitude.doubleValue), LatLng, WebMercator)
              )
            val k = 1 << z
            val x = ((webMercatorX - boundingBox.xmin) / (size / k)).intValue
            val y = ((boundingBox.ymax - webMercatorY) / (size / k)).intValue
            assert(x < (1 << z), s"Bad x value: ${x}. ${parameters.gridCoordinates(x)(y)}.")
            assert(y < (1 << z), s"Bad y value: ${y}. ${parameters.gridCoordinates(x)(y)}.")
            (x, y)
          }

      logger.trace(s"Found points in tiles ${tiles.keys.toSeq.sorted.mkString(",")}")

      for (((x, y), features) <- tiles) {
        val json = Json.obj(
          "type" -> Json.fromString("FeatureCollection"),
          "features" -> Json.arr(
            features.map { case (point, feature) =>
              featuresCache.getOrElseUpdate(
                point,
                vectorTiles.feature(point, feature)
              )
            }: _*
          )
        )
        os.write.over(
          targetDir / s"${z}-${x}-${y}.json",
          json.noSpaces,
          createFolders = true
        )
      }
    }
  }

  def writeAllVectorTiles(
    parameters: Parameters,
    subgridTargetDir: os.Path,
    hourOffset: Int,
    forecasts: IndexedSeq[IndexedSeq[Forecast]]
  ): Unit = {
    logger.debug(s"Generating vector tiles for hour offset n°${hourOffset}")

    for (vectorTiles <- allVectorTiles) {
      logger.trace(s"Generating vector tiles for layer ${vectorTiles.path}")
      writeVectorTiles(
        vectorTiles,
        subgridTargetDir / vectorTiles.path / s"${hourOffset}",
        parameters,
        forecasts
      )
    }
  }

}
