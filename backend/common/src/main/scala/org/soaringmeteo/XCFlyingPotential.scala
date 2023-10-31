package org.soaringmeteo

import squants.{Length, Velocity}

object XCFlyingPotential {

  /**
   * @param thermalVelocity   Thermal velocity
   * @param soaringLayerDepth Depth of the boundary layer
   * @param boundaryLayerWind Wind in boundary layer
   * @return A value between 0 and 100
   */
  def apply(thermalVelocity: Velocity, soaringLayerDepth: Length, wind: Wind): Int = {
    // Thermal velocity
    // coeff is 50% for a 1.55 m/s
    val thermalVelocityCoeff = logistic(thermalVelocity.toMetersPerSecond, 1.55, 5)

    // Soaring Layer Depth
    // coeff is 50% for a soaring layer depth of 400 m
    val soaringLayerDepthCoeff = logistic(soaringLayerDepth.toMeters, 400, 4)

    val thermalCoeff = (2 * thermalVelocityCoeff + soaringLayerDepthCoeff) / 3

    // Boundary Layer Wind
    // coeff is 50% for a wind force of 16 km/h
    val windCoeff = 1 - logistic(wind.speed.toKilometersPerHour, 16, 6)

    math.round(thermalCoeff * windCoeff * 100).intValue
  }

  /**
   * Logistic function (see https://en.wikipedia.org/wiki/Logistic_regression#Model)
   * @param x  input
   * @param mu “location parameter” (midpoint of the curve, where output = 50%)
   * @param k  steepness (value like 4 is quite smooth, whereas 7 is quite steep)
   */
  private def logistic(x: Double, mu: Double, k: Int): Double = {
    val L = 1 // Output max value. In our case we want the output to be a value between 0 and 1
    val s = mu / k
    L / (1 + math.exp(-(x - mu) / s))
  }

}
