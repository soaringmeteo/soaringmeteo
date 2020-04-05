package org.soaringmeteo

import eu.timepit.refined.api.{Refined, Validate}
import eu.timepit.refined.refineV

class GfsInitializationTime private ()

object GfsInitializationTime {

  type Value = Int Refined GfsInitializationTime

  implicit val gfsInitializationTimeValidate: Validate.Plain[Int, GfsInitializationTime] =
    Validate.fromPredicate(
      n => Set(0, 6, 12, 18).contains(n),
      n => s"$n is a GFS initialization time",
      new GfsInitializationTime()
    )

  /**
   * Validate that the given `n` value is a valid GFS initialization time,
   * otherwise throws an exception.
   */
  def apply(n: Int): Value =
    refineV.unsafeFrom(n)

}
