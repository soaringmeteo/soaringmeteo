package org.soaringmeteo

import squants.motion.Velocity

/**
 * @param u east-west component (positive value means wind comes from the west)
 * @param v north-south component (positive value means wind comes from the south)
 */
case class Wind(u: Velocity, v: Velocity)
