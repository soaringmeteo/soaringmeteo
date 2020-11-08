package org.soaringmeteo.wrf

import io.circe.{Encoder, Json}
import squants.motion.{Pressure, Velocity}
import squants.radio.Irradiance
import squants.space.{Angle, Length}
import squants.thermal.Temperature

/**
 * Forecast data produced by WRF run at one point in time
 */
case class Forecast(
  boundaryLayerHeight: Length,
  normalizedSun: Int, // percent
  downwardFlux: Irradiance,
  upwardFlux: Irradiance,
  latentFlux: Irradiance,
  surfaceTemperature: Temperature,
  surfaceDewPoint: Temperature,
  meanSeaLevelPressure: Pressure,
  windSpeed: Velocity,
  windDirection: Angle,
  isobaricFeatures: Seq[IsobaricFeatures]
)

case class IsobaricFeatures(
  geopotentialHeight: Length,
  temperature: Temperature,
  dewPoint: Temperature,
  windSpeed: Velocity,
  windDirection: Angle
)

object Forecast {

  val encoder: Encoder[Forecast] =
    Encoder.instance { forecast =>
      Json.obj(
        "boundary_layer_height" -> Json.fromInt(forecast.boundaryLayerHeight.toMeters.intValue),
        "normalized_sun" -> Json.fromInt(forecast.normalizedSun),
        "downward_flux" -> Json.fromInt(forecast.downwardFlux.toWattsPerSquareMeter.intValue),
        "upward_flux" -> Json.fromInt(forecast.upwardFlux.toWattsPerSquareMeter.intValue),
        "latent_flux" -> Json.fromInt(forecast.latentFlux.toWattsPerSquareMeter.intValue),
        "mean_sea_level_pressure" -> Json.fromInt(forecast.meanSeaLevelPressure.toPascals.intValue / 100),
        "surface" -> Json.obj(
          "temperature" -> Json.fromInt(forecast.surfaceTemperature.toCelsiusScale.intValue),
          "dew_point" -> Json.fromInt(forecast.surfaceDewPoint.toCelsiusScale.intValue),
          "wind_speed" -> Json.fromInt(forecast.windSpeed.toKilometersPerHour.intValue),
          "wind_direction" -> Json.fromInt(forecast.windDirection.toDegrees.intValue)
        ),
        "isobaric" -> Json.arr(
          forecast.isobaricFeatures.map { feature =>
            Json.obj(
              "geopotential_height" -> Json.fromInt(feature.geopotentialHeight.toMeters.intValue),
              "temperature" -> Json.fromInt(feature.temperature.toCelsiusScale.intValue),
              "dew_point" -> Json.fromInt(feature.dewPoint.toCelsiusScale.intValue),
              "wind_speed" -> Json.fromInt(feature.windSpeed.toKilometersPerHour.intValue),
              "wind_direction" -> Json.fromInt(feature.windDirection.toDegrees.intValue)
            )
          }: _*
        )
      )
    }

}
