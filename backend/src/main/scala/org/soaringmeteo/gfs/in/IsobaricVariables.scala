package org.soaringmeteo.gfs.in

import org.soaringmeteo.{Temperatures, Wind}
import squants.motion.{Pascals, Pressure}
import squants.space.Length
import squants.thermal.Temperature

/** Data we are interested in reading at many elevation levels */
case class IsobaricVariables(
  geopotentialHeight: Length,
  temperature: Temperature,
  relativeHumidity: Double,
  wind: Wind,
  cloudCover: Int // Between 0 and 100
) {

  lazy val dewPoint: Temperature = Temperatures.dewPoint(temperature, relativeHumidity)

}

object IsobaricVariables {
  val pressureLevels: Seq[Pressure] =
    Seq(20000, 30000, 40000, 45000, 50000, 55000, 60000, 65000, 70000, 75000, 80000, 85000, 90000, 92500, 95000, 97500, 100000)
      .map(Pascals(_))
}
