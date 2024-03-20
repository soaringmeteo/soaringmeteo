package org.soaringmeteo.out

import geotrellis.proj4.{LatLng, WebMercator}
import geotrellis.vector.{ Extent, Point => GeotrellisPoint }
import geotrellis.vector.reproject.Reproject
import geotrellis.vectortile.{MVTFeature, MVTFeatures, StrictLayer, VectorTile, VInt64, VFloat}
import org.slf4j.LoggerFactory
import org.soaringmeteo.{Forecast, Point, Wind}
import squants.Meters

/** Output of the model encoded as vector tiles */
case class VectorTiles(path: String, feature: Forecast => Wind, excluded: Forecast => Boolean = _ => false)

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
      // By default, OpenLayers assumes that 1 tile covers an area of 512 px on the map. So, if the
      // projection of the extent is larger than 512 px, OpenLayers will try to “zoom” into the tiles
      // to find only the points that are visible in the current view.
      // We find that rendering at most 15 wind arrow per tile looks good, so we make sure that
      // our tiles don’t contain more points than that. We down-sample the grid by removing every
      // other point from the previous zoom level.
      val threshold = 15
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

  val allVectorTiles = List(
    VectorTiles("wind-surface", _.surfaceWind),
    VectorTiles("wind-boundary-layer", _.boundaryLayerWind),
    VectorTiles("wind-soaring-layer-top", _.winds.soaringLayerTop),
    VectorTiles("wind-300m-agl", _.winds.`300m AGL`),
    VectorTiles("wind-2000m-amsl", _.winds.`2000m AMSL`, excluded = _.elevation > Meters(2000)),
    VectorTiles("wind-3000m-amsl", _.winds.`3000m AMSL`, excluded = _.elevation > Meters(3000)),
    VectorTiles("wind-4000m-amsl", _.winds.`4000m AMSL`, excluded = _.elevation > Meters(4000))
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
    val rootTileExtent = parameters.extent
    val zoomLevels = parameters.zoomLevels
    val maxZoom = zoomLevels - 1

    // Cache the computed features at their (longitude, latitude) coordinates
    val featuresCache = collection.concurrent.TrieMap.empty[(Double, Double), MVTFeature[GeotrellisPoint]]

    for (z <- 0 to maxZoom) {
      // Number of rows and columns in the zoom level 'z'
      val tilesCount = 1 << z
      // FIXME The root tile extent may not necessarily be square, however we _have to_ use the same tile
      // height and width in the following otherwise the position of the features is wrong.
      val tileSize = rootTileExtent.maxExtent / tilesCount
      // Show all the points at the highest zoom level only,
      // otherwise show every other point from the previous zoom level
      val step = 1 << (maxZoom - z)
      logger.trace(s"Generating tiles for zoom level ${z} (step = ${step}).")
      val visiblePoints = for {
        x <- 0 until parameters.width by step
        y <- 0 until parameters.height by step
      } yield {
        val lonLatPoint = parameters.gridCoordinates(x)(y)
        val webMercatorPoint = coordinatesCache.getOrElseUpdate(
          lonLatPoint,
          Reproject((lonLatPoint.longitude.doubleValue, lonLatPoint.latitude.doubleValue), LatLng, WebMercator)
            .ensuring(p => rootTileExtent.contains(p._1, p._2), "Features must be within the root tile extent")
        )
        (webMercatorPoint, forecasts(x)(y))
      }

      val tiles =
        visiblePoints
          // Partition the visible points by tile
          .groupBy { case ((webMercatorX, webMercatorY), _) =>
            // Compute the (x, y) tile coordinates this point belongs too
            val x = ((webMercatorX - rootTileExtent.xmin) / tileSize).intValue
            val y = ((rootTileExtent.ymax - webMercatorY) / tileSize).intValue
            assert(x < tilesCount, s"Bad x value: ${x}. ${parameters.gridCoordinates(x)(y)}.")
            assert(y < tilesCount, s"Bad y value: ${y}. ${parameters.gridCoordinates(x)(y)}.")
            (x, y)
          }

      logger.trace(s"Found points in tiles ${tiles.keys.toSeq.sorted.mkString(",")}")

      for (((x, y), features) <- tiles) {
        val tileExtent = Extent(
          rootTileExtent.xmin + x * tileSize,
          rootTileExtent.ymax - (y + 1) * tileSize,
          rootTileExtent.xmin + (x + 1) * tileSize,
          rootTileExtent.ymax - y * tileSize,
        )
//        assert(features.forall { case ((pointX, pointY), _) => tileExtent.contains(pointX, pointY) })
        val vectorTile = VectorTile(
          layers = Map(
            "points" -> StrictLayer(
              name = "points",
              tileWidth = 4096,
              version = 2,
              tileExtent = tileExtent,
              mvtFeatures = MVTFeatures(
                points = features
                  .filterNot { case (_, forecast) => vectorTiles.excluded(forecast) }
                  .map { case (point @ (webMercatorX, webMercatorY), forecast) =>
                  featuresCache.getOrElseUpdate(point, {
                    val wind = vectorTiles.feature(forecast)
                    MVTFeature(
                      geom = GeotrellisPoint(webMercatorX, webMercatorY),
                      data = Map(
                        "speed" -> VInt64(wind.speed.toKilometersPerHour.round.intValue),
                        "direction" -> VFloat(wind.direction.toFloat)
                      )
                    )
                  })
                },
                multiPoints = Nil,
                lines = Nil,
                multiLines = Nil,
                polygons = Nil,
                multiPolygons = Nil
              )
            )
          ),
          tileExtent = tileExtent
        )
        os.write.over(
          targetDir / s"${z}-${x}-${y}.mvt",
          vectorTile.toBytes,
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
