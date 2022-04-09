package org.soaringmeteo.gfs.in

import java.time.OffsetDateTime
import org.slf4j.LoggerFactory
import org.soaringmeteo.Temperatures.dewPoint
import org.soaringmeteo.{Point, Temperatures, Wind}
import org.soaringmeteo.grib.Grib
import squants.energy.SpecificEnergy
import squants.motion
import squants.motion.{Pascals, Pressure}
import squants.radio.Irradiance
import squants.space.Length
import squants.thermal.Temperature

/**
 * Forecast data for one point at one time
 */
case class Forecast(
  time: OffsetDateTime,
  elevation: Length,
  boundaryLayerDepth: Length, // m AGL
  boundaryLayerWind: Wind,
  totalCloudCover: Int, // Between 0 and 100
  convectiveCloudCover: Int, // Between 0 and 100
  atPressure: Map[Pressure, IsobaricVariables],
  mslet: Pressure,
  snowDepth: Length,
  surfaceTemperature: Temperature, // Air temperature at 2 meters above the ground level
  surfaceRelativeHumidity: Double,
  surfaceWind: Wind,
  accumulatedRain: Length,
  accumulatedConvectiveRain: Length,
  latentHeatNetFlux: Irradiance,
  sensibleHeatNetFlux: Irradiance,
  cape: SpecificEnergy,
  cin: SpecificEnergy,
  downwardShortWaveRadiationFlux: Irradiance,
  isothermZero: Length
) {

  lazy val surfaceDewPoint: Temperature =
    dewPoint(surfaceTemperature, surfaceRelativeHumidity)

}

case class CloudCover(
  entire: Double,
  low: Double,
  middle: Double,
  high: Double,
  conv: Double,
  boundary: Double
)

case class IsobaricVariables(
  geopotentialHeight: Length,
  temperature: Temperature,
  relativeHumidity: Double,
  wind: Wind,
  cloudCover: Int // Between 0 and 100
) {

  lazy val dewPoint: Temperature = Temperatures.dewPoint(temperature, relativeHumidity)

}

object Forecast {

  private val logger = LoggerFactory.getLogger(classOf[Forecast])

  val pressureLevels: Seq[motion.Pressure] =
    Seq(20000, 30000, 40000, 45000, 50000, 55000, 60000, 65000, 70000, 75000, 80000, 85000, 90000, 95000)
      .map(Pascals(_))

  /**
   * @param gribFile GRIB file to read
   * @param forecastInitDateTime Initialization time of the forecast
   * @param forecastHourOffset Time of forecast we want to extract, in number of hours
   *                           from the forecast initialization (e.g., 0, 3, 6, etc.)
   * @param locations Set of points for which we want to extract the forecast data. FIXME Extract data for all points
   */
  def fromGribFile(
    gribFile: os.Path,
    forecastInitDateTime: OffsetDateTime,
    forecastHourOffset: Int,
    locations: Seq[Point]
  ): Map[Point, Forecast] = {
    Grib.bracket(gribFile) { grib =>
      val forecastTime = forecastInitDateTime.plusHours(forecastHourOffset)
      val forecast = GfsGrib.forecast(grib, locations, forecastTime)
      logger.debug(s"Read $gribFile")
      forecast
    }
  }

}
