package org.soaringmeteo.gfs.out

import io.circe.{Encoder, Json}
import org.soaringmeteo.gfs.in
import org.soaringmeteo.{Point, Wind}
import squants.energy.SpecificEnergy
import squants.motion.{Pressure, Velocity}
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
  soaringLayerDepth: Length, // m AGL
  boundaryLayerWind: Wind,
  thermalVelocity: Velocity,
  totalCloudCover: Int, // Between 0 and 100
  convectiveCloudCover: Int, // Between 0 and 100
  convectiveClouds: Option[ConvectiveClouds],
  airDataByAltitude: SortedMap[Length, AirData],
  mslet: Pressure,
  snowDepth: Length,
  surfaceTemperature: Temperature,
  surfaceDewPoint: Temperature,
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

/**
 * Various information at some elevation level
 * @param wind        Wind force and direction at the `elevation` level
 * @param temperature Air temperature at the `elevation` level
 * @param dewPoint    Air humidity at the `elevation` level
 */
case class AirData(
  wind: Wind,
  temperature: Temperature,
  dewPoint: Temperature,
  cloudCover: Int
)

object AirData {
  def apply(atPressure: Map[Pressure, in.IsobaricVariables], groundLevel: Length): SortedMap[Length, AirData] =
    atPressure.values
      .view
      .filter(_.geopotentialHeight >= groundLevel)
      .map { variables =>
        val height = variables.geopotentialHeight
        val aboveGround =
          AirData(
            variables.wind,
            variables.temperature,
            variables.dewPoint,
            variables.cloudCover
          )
        height -> aboveGround
      }.to(SortedMap)
}

object Forecast {

  /** Transforms the forecast data into a data structure tailored to our needs */
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
              val maybeConvectiveClouds = ConvectiveClouds(gfsForecast)
              val soaringLayerDepth =
                maybeConvectiveClouds match {
                  case None => gfsForecast.boundaryLayerDepth
                  case Some(convectiveClouds) =>
                    // In case of presence of convective clouds, use the cloud base as an upper limit
                    // within the boundary layer
                    gfsForecast.boundaryLayerDepth.min(convectiveClouds.bottom - gfsForecast.elevation)
                }
              val forecast = Forecast(
                gfsForecast.time,
                gfsForecast.elevation,
                soaringLayerDepth,
                gfsForecast.boundaryLayerWind,
                Thermals.velocity(gfsForecast),
                gfsForecast.totalCloudCover,
                gfsForecast.convectiveCloudCover,
                maybeConvectiveClouds,
                AirData(gfsForecast.atPressure, gfsForecast.elevation),
                gfsForecast.mslet,
                gfsForecast.snowDepth,
                gfsForecast.surfaceTemperature,
                gfsForecast.surfaceDewPoint,
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
        Json.fromInt(forecast.soaringLayerDepth.toMeters.round.toInt),
        Json.fromInt(forecast.boundaryLayerWind.u.toKilometersPerHour.round.toInt),
        Json.fromInt(forecast.boundaryLayerWind.v.toKilometersPerHour.round.toInt),
        Json.fromInt(forecast.totalCloudCover),
        Json.fromInt(forecast.totalRain.toMillimeters.round.toInt),
        Json.fromInt(forecast.surfaceWind.u.toKilometersPerHour.round.toInt),
        Json.fromInt(forecast.surfaceWind.v.toKilometersPerHour.round.toInt),
        Json.fromInt(winds.`300m AGL`.u.toKilometersPerHour.round.toInt),
        Json.fromInt(winds.`300m AGL`.v.toKilometersPerHour.round.toInt),
        Json.fromInt(winds.boundaryLayerTop.u.toKilometersPerHour.round.toInt),
        Json.fromInt(winds.boundaryLayerTop.v.toKilometersPerHour.round.toInt),
        Json.fromInt((forecast.thermalVelocity.toMetersPerSecond * 10).round.toInt), // dm/s (to avoid floating point values)
        Json.fromInt(forecast.convectiveClouds.fold(0)(clouds => (clouds.top - clouds.bottom).toMeters.round.toInt))
      )
    }

}
