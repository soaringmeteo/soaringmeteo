package org.soaringmeteo.gfs

import org.soaringmeteo.Point

/**
  * Area for which we want to download forecast data
  */
case class Area(
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

/**
 * An area coupled with an hour offset (number of hours after a
 * run initialization time)
 */
case class AreaAndHour(area: Area, hourOffset: Int)

object AreaAndHour {

  /**
   * All the areas and hour offsets we are interested in.
   */
  val all: Seq[AreaAndHour] =
    for {
      t    <- Settings.forecastHours
      area <- Settings.gfsDownloadAreas
    } yield AreaAndHour(area, t)

}
