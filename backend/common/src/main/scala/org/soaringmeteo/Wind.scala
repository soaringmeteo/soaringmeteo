package org.soaringmeteo

import squants.motion.{KilometersPerHour, Velocity}

/**
 * @param u east-west component (positive value means wind comes from the west)
 * @param v north-south component (positive value means wind comes from the south)
 */
case class Wind(u: Velocity, v: Velocity) {
  lazy val speed: Velocity = {
    val u2 = u.toKilometersPerHour
    val v2 = v.toKilometersPerHour
    KilometersPerHour(math.sqrt(u2 * u2 + v2 * v2))
  }
  /** Direction of the wind in radians */
  lazy val direction: Double =
    math.atan2(u.toKilometersPerHour, v.toKilometersPerHour)
}
