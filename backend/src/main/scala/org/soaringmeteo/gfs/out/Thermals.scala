package org.soaringmeteo.gfs.out

import org.soaringmeteo.gfs.in
import squants.mass.KilogramsPerCubicMeter
import squants.{Kelvin, Velocity}
import squants.motion.MetersPerSecond

object Thermals {

  // Estimation of thermals updraft velocity.
  // I first wanted to try the model described in http://rrp.infim.ro/2021/AN73704.pdf (by Cristian Vraciu)
  // but the author himself advised me to use the formula introduced by Lenschow and Stephens, given
  // here https://fr.wikipedia.org/wiki/Vitesse_convective and
  // here http://www.drjack.info/BLIP/INFO/parameter_details.html#Wstar
  def velocity(forecast: in.Forecast): Velocity = {
    val s = forecast.sensibleHeatNetFlux
    if (s.toWattsPerSquareMeter < 0) MetersPerSecond(0) else {
      val g = squants.motion.StandardEarthGravity
      val z = forecast.boundaryLayerDepth
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

}
