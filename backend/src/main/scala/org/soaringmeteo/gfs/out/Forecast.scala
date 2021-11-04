package org.soaringmeteo.gfs.out

import io.circe.{Encoder, Json}
import org.soaringmeteo.gfs.in
import org.soaringmeteo.{ Point, Wind }
import squants.energy.SpecificEnergy
import squants.motion.Pressure
import squants.radio.Irradiance
import squants.space.Length
import squants.thermal.Temperature

import java.time.OffsetDateTime
import scala.collection.immutable.SortedMap

/**
 * Result of processing a [[org.soaringmeteo.gfs.in.Forecast]].
 */
case class Forecast(
  time: OffsetDateTime,
  elevation: Length,
  boundaryLayerHeight: Length,
  boundaryLayerWind: Wind,
  cloudCover: CloudCover,
  airDataByAltitude: SortedMap[Length, AirData],
  mslet: Pressure,
  snowDepth: Length,
  surfaceTemperature: Temperature,
  surfaceRelativeHumidity: Double,
  surfaceWind: Wind,
  totalRain: Length,
  convectiveRain: Length,
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

object CloudCover {
  def apply(cloudCover: in.CloudCover): CloudCover =
    CloudCover(
      cloudCover.entire,
      cloudCover.low,
      cloudCover.middle,
      cloudCover.high,
      cloudCover.conv,
      cloudCover.boundary
    )
}

/**
 * Various information at some elevation level
 * @param wind        Wind force and direction at the `elevation` level
 * @param temperature Air temperature at the `elevation` level
 * @param dewPoint    Air humidity at the `elevation` level
 */
case class AirData(
  wind: Wind,
  temperature: Temperature,
  dewPoint: Temperature
)

object AirData {
  def apply(atPressure: Map[Pressure, in.IsobaricVariables]): SortedMap[Length, AirData] =
    atPressure.view.map { case (_, variables) =>
      val height = variables.geopotentialHeight
      val aboveGround =
        AirData(
          variables.wind,
          variables.temperature,
          LocationForecasts.dewPoint(variables.temperature, variables.relativeHumidity)
        )
      height -> aboveGround
    }.to(SortedMap)
}

object Forecast {

  def apply(gfsForecastsByHourAndLocation: Map[Int, Map[Point, in.Forecast]]): ForecastsByHour = {
    gfsForecastsByHourAndLocation
      // Make sure we iterate over the forecasts in chronological order
      .to(SortedMap)
      // Transform accumulated rain into per-period rain
      .foldLeft((Option.empty[Map[Point, in.Forecast]], Map.newBuilder[Int, ForecastsByLocation])) {
        case ((maybePreviousForecast, builder), (hour, gfsForecastsByLocation)) =>
          val extractTotalAndConvectiveRain: (Point, in.Forecast) => (Length, Length) =
            maybePreviousForecast match {
              case None =>
                // First forecast (+3h) is special, it contains the accumulated
                // rain since the forecast initialization time, which is equivalent
                // to the rain that fell during the forecast period
                (_, gfsForecast) => (gfsForecast.accumulatedRain, gfsForecast.accumulatedConvectiveRain)
              case Some(previousForecast) =>
                (point, gfsForecast) => (
                  gfsForecast.accumulatedRain - previousForecast(point).accumulatedRain,
                  gfsForecast.accumulatedConvectiveRain - previousForecast(point).accumulatedConvectiveRain
                )
            }
          val forecastsByLocation =
            gfsForecastsByLocation.map { case (point, gfsForecast) =>
              val (totalRain, convectiveRain) = extractTotalAndConvectiveRain(point, gfsForecast)
              val forecast = Forecast(
                gfsForecast.time,
                gfsForecast.elevation,
                gfsForecast.boundaryLayerHeight,
                gfsForecast.boundaryLayerWind,
                CloudCover(gfsForecast.cloudCover),
                AirData(gfsForecast.atPressure),
                gfsForecast.mslet,
                gfsForecast.snowDepth,
                gfsForecast.surfaceTemperature,
                gfsForecast.surfaceRelativeHumidity,
                gfsForecast.surfaceWind,
                totalRain,
                convectiveRain,
                gfsForecast.latentHeatNetFlux,
                gfsForecast.sensibleHeatNetFlux,
                gfsForecast.cape,
                gfsForecast.cin,
                gfsForecast.downwardShortWaveRadiationFlux,
                gfsForecast.isothermZero
              )
              (point, forecast)
            }
          builder += hour -> forecastsByLocation
          (Some(gfsForecastsByLocation), builder)
      }._2.result()
  }

  /**
   * JSON representation of the forecast data summary.
   * WARNING: client must be consistent with this serialization format.
   */
  val jsonEncoder: Encoder[Forecast] =
    Encoder.instance { forecast =>
      val winds = Winds(forecast)
      Json.arr(
        Json.fromInt(forecast.boundaryLayerHeight.toMeters.round.toInt),
        Json.fromInt(forecast.boundaryLayerWind.u.toKilometersPerHour.round.toInt),
        Json.fromInt(forecast.boundaryLayerWind.v.toKilometersPerHour.round.toInt),
        Json.fromBigDecimal(forecast.cloudCover.entire),
        Json.fromInt(forecast.totalRain.toMillimeters.round.toInt),
        Json.fromInt(forecast.surfaceWind.u.toKilometersPerHour.round.toInt),
        Json.fromInt(forecast.surfaceWind.v.toKilometersPerHour.round.toInt),
        Json.fromInt(winds.`300m AGL`.u.toKilometersPerHour.round.toInt),
        Json.fromInt(winds.`300m AGL`.v.toKilometersPerHour.round.toInt),
        Json.fromInt(winds.boundaryLayerTop.u.toKilometersPerHour.round.toInt),
        Json.fromInt(winds.boundaryLayerTop.v.toKilometersPerHour.round.toInt)
      )
    }

}
