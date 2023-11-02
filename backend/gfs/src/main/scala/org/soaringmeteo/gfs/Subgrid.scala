package org.soaringmeteo.gfs

import Settings.gfsForecastSpaceResolution
import geotrellis.proj4.{LatLng, WebMercator}
import geotrellis.vector.Extent
import geotrellis.vector.reproject.Reproject
import org.soaringmeteo.out.VectorTiles
import org.soaringmeteo.Point

/**
 * A subgrid within the GFS domain
 * @param id    Unique identifier (used to generate paths)
 * @param label Human-readable name
 */
case class Subgrid(id: String, label: String, leftLongitude: BigDecimal, bottomLatitude: BigDecimal, rightLongitude: BigDecimal, topLatitude: BigDecimal) {
  private val k = gfsForecastSpaceResolution / BigDecimal(100)
  assert(
    Seq(leftLongitude, rightLongitude, topLatitude, bottomLatitude).forall(coordinate => coordinate % k == 0.0),
    "Subgrid coordinates are not aligned with the GFS domain. The coordinates must be divisible by 0.25."
  )
  assert(leftLongitude < rightLongitude && bottomLatitude < topLatitude)

  /** The longitudes of all the points covered by the subgrid, from west to east */
  val longitudes: IndexedSeq[BigDecimal] = leftLongitude to rightLongitude by k
  /** The latitudes of all the points covered by the subgrid, from north to south */
  val latitudes: IndexedSeq[BigDecimal]  = topLatitude to bottomLatitude by -k

  /** Number of points horizontally */
  def width: Int = longitudes.size
  /** Number of points vertically */
  def height: Int = latitudes.size
  /** Number of points in total */
  def size: Int = width * height

  lazy val vectorTilesParameters: VectorTiles.Parameters = {
    val (xmin, ymin) = Reproject((leftLongitude.doubleValue, bottomLatitude.doubleValue), LatLng, WebMercator)
    val (xmax, ymax) = Reproject((rightLongitude.doubleValue, topLatitude.doubleValue), LatLng, WebMercator)
    // Generate the points within a bounding box around the grid.
    val extent = Extent(xmin, ymin, xmax, ymax).buffer(5000 /* meters */) /* buffering would be necessary if the icons were clipped when rendered by OpenLayers */

    val maxViewZoom = 8 // Empirical value

    val coordinates =
      for (longitude <- longitudes) yield
        for (latitude <- latitudes) yield Point(latitude, longitude)

    VectorTiles.Parameters(extent, maxViewZoom, width, height, coordinates)
  }

}
