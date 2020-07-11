package org.soaringmeteo

import io.circe.{Encoder, Json}
import squants.motion
import squants.motion.{Pascals, Pressure, Velocity}
import squants.radio.Irradiance
import squants.space.Length
import squants.thermal.Temperature

/**
 * Forecast data for one point at one time
 */
case class GfsForecast(
  elevation: Length, // FIXME Find another way to send this information since it doesn’t vary accross forecasts (it is dependent on the location only)
  boundaryLayerHeight: Length,
  boundaryLayerWind: Wind,
  cloudCover: CloudCover,
  atPressure: Map[Pressure, IsobaricVariables],
  mslet: Pressure,
  snowDepth: Length,
  surfaceTemperature: Temperature,
  surfaceRelativeHumidity: Double,
  surfaceWind: Wind,
  accumulatedRain: Length, // TODO Compute rain per forecast period instead of total accumulated rain
  accumulatedConvectiveRain: Length,
  latentHeatNetFlux: Irradiance,
  sensibleHeatNetFlux: Irradiance,
  cape: Double, // J/kg
  cin: Double, // J/kg
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
   * @param gribsDir     Directory containing the downloaded GRIB files
   * @param forecastTime Time of forecast we want to extract, in number of hours
   *                     from the forecast initialization (e.g., 0, 3, 6, etc.)
   * @param locations    Set of points for which we want to extract the forecast data. FIXME Extract data for all points
   * @return
   */
  def fromGribFile(gribsDir: os.Path, forecastTime: Int, locations: Seq[GfsLocation]): Map[Point, GfsForecast] = {
    val gribFile = gribsDir / forecastTime.toString()
    Grib.bracket(gribFile) { grib =>
      grib.forecast(locations)
    }
  }

  /**
   * JSON representation of the forecast data summary.
   * WARNING: client must be consistent with this serialization format.
   */
  val summaryEncoder: Encoder[GfsForecast] =
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

  val detailEncoder: Encoder[GfsForecast] =
    Encoder.instance { forecast =>
      Json.obj(
        "bl" -> Json.obj(
          "h" -> Json.fromInt(forecast.boundaryLayerHeight.toMeters.round.toInt),
          "u" -> Json.fromInt(forecast.boundaryLayerWind.u.toKilometersPerHour.round.toInt),
          "v" -> Json.fromInt(forecast.boundaryLayerWind.v.toKilometersPerHour.round.toInt)
        ),
        "c" -> Json.obj(
          "e" -> Json.fromBigDecimal(forecast.cloudCover.entire),
          "l" -> Json.fromBigDecimal(forecast.cloudCover.low),
          "m" -> Json.fromBigDecimal(forecast.cloudCover.middle),
          "h" -> Json.fromBigDecimal(forecast.cloudCover.high),
          "c" -> Json.fromBigDecimal(forecast.cloudCover.conv),
          "b" -> Json.fromBigDecimal(forecast.cloudCover.boundary)
        ),
        "p" -> Json.obj(pressureLevels.map { pressure =>
          val variables = forecast.atPressure(pressure)
          (pressure.toPascals.round.toInt / 100).toString -> Json.obj(
            "h" -> Json.fromInt(variables.geopotentialHeight.toMeters.round.toInt),
            "t" -> Json.fromBigDecimal(variables.temperature.toCelsiusDegrees),
            "rh" -> Json.fromBigDecimal(variables.relativeHumidity),
            "u" -> Json.fromInt(variables.wind.u.toKilometersPerHour.round.toInt),
            "v" -> Json.fromInt(variables.wind.v.toKilometersPerHour.round.toInt)
          )
        }: _*),
        "s" -> Json.obj(
          "h" -> Json.fromInt(forecast.elevation.toMeters.round.toInt),
          "t" -> Json.fromBigDecimal(forecast.surfaceTemperature.toCelsiusDegrees),
          "rh" -> Json.fromBigDecimal(forecast.surfaceRelativeHumidity),
          "u" -> Json.fromInt(forecast.surfaceWind.u.toKilometersPerHour.round.toInt),
          "v" -> Json.fromInt(forecast.surfaceWind.v.toKilometersPerHour.round.toInt)
        ),
        "iso" -> Json.fromInt(forecast.isothermZero.toMeters.round.toInt),
        "r" -> Json.obj(
          "t" -> Json.fromInt(forecast.accumulatedRain.toMillimeters.round.toInt),
          "c" -> Json.fromInt(forecast.accumulatedConvectiveRain.toMillimeters.round.toInt)
        )
        // TODO Irradiance, CAPE, CIN, MSLET, snow
      )
    }

}
