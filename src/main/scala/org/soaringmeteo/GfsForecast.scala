package org.soaringmeteo

import java.time.{LocalTime, OffsetDateTime, ZoneOffset}

import io.circe.{Encoder, Json}
import squants.energy.SpecificEnergy
import squants.motion
import squants.motion.{Pascals, Pressure, Velocity}
import squants.radio.Irradiance
import squants.space.Length
import squants.thermal.Temperature

/**
 * Forecast data for one point at one time
 */
case class GfsForecast(
  time: OffsetDateTime,
  elevation: Length,
  boundaryLayerHeight: Length,
  boundaryLayerWind: Wind,
  cloudCover: CloudCover,
  atPressure: Map[Pressure, IsobaricVariables],
  mslet: Pressure,
  snowDepth: Length,
  surfaceTemperature: Temperature,
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
)

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
  wind: Wind
)

/**
 * @param u east-west component (positive value means wind comes from the west)
 * @param v north-south component (positive value means wind comes from the south)
 */
case class Wind(u: Velocity, v: Velocity)

object GfsForecast {

  val pressureLevels: Seq[motion.Pressure] =
    Seq(20000, 30000, 40000, 45000, 50000, 55000, 60000, 65000, 70000, 75000, 80000, 85000, 90000, 95000)
      .map(Pascals(_))

  /**
   * @param gribsDir Directory containing the downloaded GRIB files
   * @param forecastInitDateTime Initialization time of the forecast
   * @param forecastHourOffset Time of forecast we want to extract, in number of hours
   *                           from the forecast initialization (e.g., 0, 3, 6, etc.)
   * @param locations Set of points for which we want to extract the forecast data. FIXME Extract data for all points
   * @return
   */
  def fromGribFile(
    gribsDir: os.Path,
    forecastInitDateTime: OffsetDateTime,
    forecastHourOffset: Int,
    locations: Seq[Point]
  ): Map[Point, GfsForecast] = {
    val gribFile = gribsDir / forecastHourOffset.toString()
    Grib.bracket(gribFile) { grib =>
      val forecastTime = forecastInitDateTime.plusHours(forecastHourOffset)
      grib.forecast(locations, forecastTime)
    }
  }

  /**
   * JSON representation of the forecast data summary.
   * WARNING: client must be consistent with this serialization format.
   */
  val jsonEncoder: Encoder[GfsForecast] =
    Encoder.instance { forecast =>
      Json.obj(
        "blh" -> Json.fromInt(forecast.boundaryLayerHeight.toMeters.round.toInt),
        "u" -> Json.fromInt(forecast.boundaryLayerWind.u.toKilometersPerHour.round.toInt),
        "v" -> Json.fromInt(forecast.boundaryLayerWind.v.toKilometersPerHour.round.toInt),
        "c" -> Json.obj(
          "e" -> Json.fromBigDecimal(forecast.cloudCover.entire),
          "l" -> Json.fromBigDecimal(forecast.cloudCover.low),
          "m" -> Json.fromBigDecimal(forecast.cloudCover.middle),
          "h" -> Json.fromBigDecimal(forecast.cloudCover.high)
        )
      )
    }

}
