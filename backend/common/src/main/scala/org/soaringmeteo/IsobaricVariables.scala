package org.soaringmeteo

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
