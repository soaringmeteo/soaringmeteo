package org.soaringmeteo.gfs.out

import geotrellis.proj4.{LatLng, WebMercator}
import geotrellis.vector.reproject.Reproject
import io.circe.Json
import org.slf4j.LoggerFactory
import org.soaringmeteo.Wind
import org.soaringmeteo.gfs.Subgrid

/** Output of the model encoded as vector tiles */
case class VectorTiles(path: String, feature: (BigDecimal, BigDecimal, Forecast) => Json)
object VectorTiles {

  private val logger = LoggerFactory.getLogger(getClass)

  def windFeature(wind: Forecast => Wind): (BigDecimal, BigDecimal, Forecast) => Json = { (lon, lat, forecast) =>
    val value = wind(forecast)
    val u = value.u.toKilometersPerHour
    val v = value.v.toKilometersPerHour
    val speed = math.sqrt(u * u + v * v).round.intValue // km/h
    val direction = math.atan2(u, v) // rad
    Json.obj(
      "type" -> Json.fromString("Feature"),
      "geometry" -> Json.obj(
        "type" -> Json.fromString("Point"),
        "coordinates" -> Json.arr(Json.fromBigDecimal(lon), Json.fromBigDecimal(lat))
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
    collection.concurrent.TrieMap.empty[(BigDecimal, BigDecimal), (Double, Double)]

  def writeVectorTiles(
    vectorTiles: VectorTiles,
    targetDir: os.Path,
    subgrid: Subgrid,
    forecasts: IndexedSeq[IndexedSeq[Forecast]]
  ): Unit = {
    val boundingBox = subgrid.vectorTilesParameters.extent
    val zoomLevels = subgrid.vectorTilesParameters.zoomLevels
    val maxZoom = zoomLevels - 1

    val size = boundingBox.maxExtent
    // Cache the computed features at their (longitude, latitude) coordinates
    val featuresCache = collection.concurrent.TrieMap.empty[(BigDecimal, BigDecimal), Json]

    for (z <- 0 to maxZoom) {
      // Show all the points at the highest zoom level only,
      // otherwise show every other point from the previous zoom level
      val step = 1 << (maxZoom - z)
      logger.trace(s"Generating tiles for zoom level ${z} (step = ${step}).")
      val visiblePoints = for {
        x <- 0 until subgrid.width by step
        y <- 0 until subgrid.height by step
      } yield (subgrid.longitudes(x), subgrid.latitudes(y), forecasts(x)(y))

      val tiles =
        visiblePoints
          // Partition the visible points by tile
          .groupBy { case (longitude, latitude, _) =>
            // Compute the (x, y) tile coordinates this (lon, lat) point belongs too
            val (webMercatorX, webMercatorY) =
              coordinatesCache.getOrElseUpdate(
                (longitude, latitude),
                Reproject((longitude.doubleValue, latitude.doubleValue), LatLng, WebMercator)
              )
            val k = 1 << z
            val x = ((webMercatorX - boundingBox.xmin) / (size / k)).intValue
            val y = ((boundingBox.ymax - webMercatorY) / (size / k)).intValue
            assert(x < (1 << z), s"Bad x value: ${x}. ${subgrid.longitudes(x)}, ${subgrid.latitudes(y)}.")
            assert(y < (1 << z), s"Bad y value: ${y}. ${subgrid.longitudes(x)}, ${subgrid.latitudes(y)}.")
            (x, y)
          }

      // TODO Check why we have no points in some tiles
      logger.trace(s"Found points in tiles ${tiles.keys.toSeq.sorted.mkString(",")}")

      for (((x, y), features) <- tiles) {
        val json = Json.obj(
          "type" -> Json.fromString("FeatureCollection"),
          "features" -> Json.arr(
            features.map { case (longitude, latitude, feature) =>
              featuresCache.getOrElseUpdate(
                (longitude, latitude),
                vectorTiles.feature(longitude, latitude, feature)
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
    subgrid: Subgrid,
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
        subgrid,
        forecasts
      )
    }
  }

}
