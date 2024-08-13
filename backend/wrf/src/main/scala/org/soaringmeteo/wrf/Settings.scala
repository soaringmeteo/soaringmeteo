package org.soaringmeteo.wrf

import java.time.Period

object Settings {

  /** Number of days of old forecast we keep */
  val forecastHistory: Period = Period.ofDays(4)

}
