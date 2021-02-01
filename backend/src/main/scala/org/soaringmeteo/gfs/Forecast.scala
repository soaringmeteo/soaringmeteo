package org.soaringmeteo.gfs

import io.circe.{Encoder, Json}
import org.soaringmeteo.Point
import squants.energy.SpecificEnergy
import squants.motion.Pressure
import squants.radio.Irradiance
import squants.space.Length
import squants.thermal.Temperature

import java.time.OffsetDateTime
import scala.collection.immutable.SortedMap

/**
 * Forecast data at a given time and location.
 * It is a copy of [[GfsForecast]], but the rain is computed
 * per forecast period, instead of being accumulated.
 */
case class Forecast(
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
  totalRain: Length,
  convectiveRain: Length,
  latentHeatNetFlux: Irradiance,
  sensibleHeatNetFlux: Irradiance,
  cape: SpecificEnergy,
  cin: SpecificEnergy,
  downwardShortWaveRadiationFlux: Irradiance,
  isothermZero: Length
)

object Forecast {

  def apply(gfsForecastsByHourAndLocation: Map[Int, Map[Point, GfsForecast]]): ForecastsByHour = {
    gfsForecastsByHourAndLocation
      // Make sure we iterate over the forecasts in chronological order
      .to(SortedMap)
      // Transform accumulated rain into per-period rain
      .foldLeft((Option.empty[Map[Point, GfsForecast]], Map.newBuilder[Int, ForecastsByLocation])) {
        case ((maybePreviousForecast, builder), (hour, gfsForecastsByLocation)) =>
          val extractTotalAndConvectiveRain: (Point, GfsForecast) => (Length, Length) =
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
                gfsForecast.cloudCover,
                gfsForecast.atPressure,
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
      Json.arr(
        Json.fromInt(forecast.boundaryLayerHeight.toMeters.round.toInt),
        Json.fromInt(forecast.boundaryLayerWind.u.toKilometersPerHour.round.toInt),
        Json.fromInt(forecast.boundaryLayerWind.v.toKilometersPerHour.round.toInt),
        Json.fromBigDecimal(forecast.cloudCover.entire),
        Json.fromInt(forecast.totalRain.toMillimeters.round.toInt)
      )
    }

}
