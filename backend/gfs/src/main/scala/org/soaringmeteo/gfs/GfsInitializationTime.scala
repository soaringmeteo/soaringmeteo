package org.soaringmeteo.gfs

import eu.timepit.refined.api.{Refined, Validate}

class GfsInitializationTime private ()

object GfsInitializationTime {

  type Value = Int Refined GfsInitializationTime

  implicit val gfsInitializationTimeValidate: Validate.Plain[Int, GfsInitializationTime] =
    Validate.fromPredicate(
      n => Set(0, 6, 12, 18).contains(n),
      n => s"$n is a GFS initialization time",
      new GfsInitializationTime()
    )

}
