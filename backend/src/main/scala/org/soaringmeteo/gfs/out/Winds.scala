package org.soaringmeteo.gfs.out

import org.soaringmeteo.{Interpolation, Wind}
import squants.space.{Length, Meters}

import scala.collection.immutable.ArraySeq

/** Wind values at several elevation levels */
case class Winds(
  `300m AGL`: Wind,
  soaringLayerTop: Wind,
  `2000m AMSL`: Wind,
  `3000m AMSL`: Wind,
  `4000m AMSL`: Wind
)

object Winds {

  def apply(forecast: Forecast): Winds = {
    val airDataSorted =
      forecast.airDataByAltitude.view
        .map { case (elevation, airData) => (elevation, airData.wind) }
        .to(ArraySeq)

    def at(elevation: Length): Wind = {
      Interpolation.interpolateSortedSeq(
        airDataSorted,
        elevation
      )(
        _ - _,
        _ / _,
        (wind: Wind, q: Double) => Wind(wind.u * q, wind.v * q),
        (wind1: Wind, wind2: Wind) => Wind(wind1.u + wind2.u, wind1.v + wind2.v),
        (wind1: Wind, wind2: Wind) => Wind(wind1.u - wind2.u, wind1.v - wind2.v)
      )
    }

    Winds(
      at(forecast.elevation + Meters(300)),
      at(forecast.elevation + forecast.soaringLayerDepth),
      at(Meters(2000)),
      at(Meters(3000)),
      at(Meters(4000))
    )
  }

}
