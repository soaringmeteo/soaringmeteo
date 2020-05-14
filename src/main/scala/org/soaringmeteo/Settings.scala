package org.soaringmeteo

object Settings {

  /** Sequence of forecast hour numbers of a GFS run (e.g. 3, 6, 9, 12, etc.) */
  val forecastHours: Seq[Int] = (for {
    day  <- 0 to 7
    time <- 0 until 24 by 3
  } yield day * 24 + time).drop(1) // Drop the first forecast because it doesn't contain the same information as the others

}
