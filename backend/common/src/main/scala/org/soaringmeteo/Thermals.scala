package org.soaringmeteo

import squants.mass.KilogramsPerCubicMeter
import squants.{Kelvin, Velocity}
import squants.motion.MetersPerSecond
import squants.radio.Irradiance
import squants.space.Length

object Thermals {

  // Estimation of thermals updraft velocity.
  // I first wanted to try the model described in http://rrp.infim.ro/2021/AN73704.pdf (by Cristian Vraciu)
  // but the author himself advised me to use the formula introduced by Lenschow and Stephens, given
  // here https://fr.wikipedia.org/wiki/Vitesse_convective and
  // here http://www.drjack.info/BLIP/INFO/parameter_details.html#Wstar
  def velocity(irradiance: Irradiance, boundaryLayerDepth: Length): Velocity = {
    val s = irradiance
    if (s.toWattsPerSquareMeter < 0) MetersPerSecond(0) else {
      val g = squants.motion.StandardEarthGravity
      val z = boundaryLayerDepth
      val airDensity = KilogramsPerCubicMeter(1.225)
      val airHeatCapacity = 1006 // J K⁻¹ kg ⁻¹ (based on https://en.wikipedia.org/wiki/Table_of_specific_heat_capacities.)

      val q = s.toWattsPerSquareMeter / (airHeatCapacity * airDensity.toKilogramsPerCubicMeter)

      val theta = Kelvin(273)
      MetersPerSecond(
        math.pow(
          (q * z.toMeters * g.toMetersPerSecondSquared) / theta.toKelvinScale,
          1.0 / 3.0
        )
      )
    }
  }

  /**
   * Depth of atmosphere where pilots can expect to soar.
   * In presence of convective clouds, the cloud base is the upper limit,
   * otherwise, the planetary boundary layer height is the upper limit.
   * @param elevation             Ground level (AMSL)
   * @param boundaryLayerDepth    Planetary boundary layer depth (AGL)
   * @param maybeConvectiveClouds Possible presence of convective clouds
   * @return Height above ground level
   */
  def soaringLayerDepth(
    elevation: Length /* AMSL */,
    boundaryLayerDepth: Length /* AGL */,
    maybeConvectiveClouds: Option[ConvectiveClouds]
  ): Length =
    maybeConvectiveClouds match {
      case None => boundaryLayerDepth
      // In case of presence of convective clouds, use the cloud base as an upper limit
      // within the boundary layer
      case Some(ConvectiveClouds(bottom, _)) => boundaryLayerDepth.min(bottom - elevation)
    }

}
