package org.soaringmeteo.gfs

import org.soaringmeteo.Point

/**
  * Area for which we want to download forecast data
  */
case class GfsDownloadBounds(
  id: String, // "A", "B", "C", etc. in old soargfs
  leftLongitude: BigDecimal,
  rightLongitude: BigDecimal,
  bottomLatitude: BigDecimal,
  topLatitude: BigDecimal
) {

  def contains(point: Point): Boolean =
    bottomLatitude <= point.latitude &&
      topLatitude >= point.latitude &&
      leftLongitude <= point.longitude &&
      rightLongitude >= point.longitude

}
