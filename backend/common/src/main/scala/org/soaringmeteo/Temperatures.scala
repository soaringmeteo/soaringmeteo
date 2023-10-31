package org.soaringmeteo

import squants.thermal.{Celsius, Temperature}

object Temperatures {

  def dewPoint(temperature: Temperature, relativeHumidity: Double): Temperature = {
    // Magnus formula: https://en.wikipedia.org/wiki/Dew_point#Calculating_the_dew_point
    val b = 17.67
    val c = 243.5
    val t = temperature.toCelsiusScale
    val gamma = math.log(relativeHumidity / 100) + b * t / (c + t)
    Temperature(c * gamma / (b - gamma), Celsius)
  }

}
