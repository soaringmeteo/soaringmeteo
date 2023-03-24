package org.soaringmeteo.gfs.out

import io.circe.Json

/**
 * Output variable of the model
 */
trait OutputVariable {
  /** Path prefix unique to this variable */
  def path: String
  /** JSON encoder */
  def toJson(forecast: Forecast): Json
}

object OutputVariable {
  def apply(path: String)(toJson: Forecast => Json): OutputVariable = {
    val pathArgument   = path
    val toJsonArgument = toJson
    new OutputVariable {
      def path: String = pathArgument
      def toJson(forecast: Forecast): Json = toJsonArgument(forecast)
    }
  }

  val gfsOutputVariables: List[OutputVariable] = List(
    // Thermals
    OutputVariable("soaring-layer-depth") { forecast =>
      Json.fromInt(forecast.soaringLayerDepth.toMeters.round.toInt)
    },
    OutputVariable("thermal-velocity") { forecast =>
      Json.fromInt((forecast.thermalVelocity.toMetersPerSecond * 10).round.toInt) // dm/s (to avoid floating point values)
    },
    // Clouds and Rain
    OutputVariable("cloud-cover") { forecast =>
      Json.fromInt(forecast.totalCloudCover)
    },
    OutputVariable("cumulus-depth") { forecast =>
      Json.fromInt(forecast.convectiveClouds.fold(0)(clouds => (clouds.top - clouds.bottom).toMeters.round.toInt))
    },
    OutputVariable("rain") { forecast =>
      Json.fromInt(forecast.totalRain.toMillimeters.round.toInt)
    },
    // Wind
    OutputVariable("wind-surface") { forecast =>
      Json.arr(
        Json.fromInt(forecast.surfaceWind.u.toKilometersPerHour.round.toInt),
        Json.fromInt(forecast.surfaceWind.v.toKilometersPerHour.round.toInt)
      )
    },
    OutputVariable("wind-boundary-layer") { forecast =>
      Json.arr(
        Json.fromInt(forecast.boundaryLayerWind.u.toKilometersPerHour.round.toInt),
        Json.fromInt(forecast.boundaryLayerWind.v.toKilometersPerHour.round.toInt)
      )
    },
    OutputVariable("wind-300m-agl") { forecast =>
      Json.arr(
        Json.fromInt(forecast.winds.`300m AGL`.u.toKilometersPerHour.round.toInt),
        Json.fromInt(forecast.winds.`300m AGL`.v.toKilometersPerHour.round.toInt)
      )
    },
    OutputVariable("wind-soaring-layer-top") { forecast =>
      Json.arr(
        Json.fromInt(forecast.winds.boundaryLayerTop.u.toKilometersPerHour.round.toInt),
        Json.fromInt(forecast.winds.boundaryLayerTop.v.toKilometersPerHour.round.toInt)
      )
    }
  )

}
