package org.soaringmeteo.gfs

import Settings.gfsForecastSpaceResolution
import geotrellis.proj4.{LatLng, WebMercator}
import geotrellis.vector.Extent
import geotrellis.vector.reproject.Reproject

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

  lazy val vectorTilesParameters: VectorTilesParameters = {
    val (xmin, ymin) = Reproject((leftLongitude.doubleValue, bottomLatitude.doubleValue), LatLng, WebMercator)
    val (xmax, ymax) = Reproject((rightLongitude.doubleValue, topLatitude.doubleValue), LatLng, WebMercator)
    // Generate the points within a square bounding box around the grid.
    val extent = Extent(xmin, ymin, xmax, ymax).buffer(5000 /* meters */) /* buffering would be necessary if the icons were clipped when rendered by OpenLayers */

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
    var zoomLevels = 1
    var maxPoints = math.max(width, height)
    while (maxPoints > threshold) {
      maxPoints = maxPoints / 2
      zoomLevels = zoomLevels + 1
    }
    // The minimal zoom level of the tiles is always 0, but here we define the minimal
    // zoom level of the view. It means that there is no point in trying to show the
    // wind arrows when the view zoom level is below that value, because the information
    // would be too small.
    // In the case of GFS0.25, we find that showing a wind arrow on all the points looks good
    // only when the view zoom level is 8 or above, so if the tiles have only 1 zoom level,
    // the minimal view zoom level should be 8, if the tiles have 2 zoom levels the minimal
    // view zoom level should be 7, and so on.
    val minVewZoom = math.max(9 - zoomLevels, 0)
    VectorTilesParameters(extent, zoomLevels, minVewZoom)
  }

}

/**
 * Parameters for generating the vector tiles.
 */
case class VectorTilesParameters(extent: Extent, zoomLevels: Int, minViewZoom: Int)
