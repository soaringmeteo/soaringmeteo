package org.soaringmeteo.gfs.out

import org.soaringmeteo.Wind
import squants.space.{Length, Meters}

import scala.annotation.tailrec
import scala.collection.immutable.ArraySeq

/** Wind values at several elevation levels */
case class Winds(
  `300m AGL`: Wind,
  boundaryLayerTop: Wind
)

object Winds {

  def apply(forecast: Forecast): Winds = {
    val airDataSorted = forecast.airDataByAltitude.to(ArraySeq)

    def at(heightAboveGroundLevel: Length): Wind = {
      val elevation = forecast.elevation + heightAboveGroundLevel
      interpolateWind(airDataSorted, elevation, 0, airDataSorted.size - 1)
    }

    Winds(
      at(Meters(300)),
      at(forecast.boundaryLayerHeight)
    )
  }

  /**
   * Interpolate the wind value at the given `elevation`, based on the forecast data that provides
   * wind values at several elevation levels.
   *
   * Performs a dichotomous search in the sequence, and interpolates the wind values found for the
   * elevations just below and above the desired `elevation`.
   *
   * @param airDataSorted A sequence of pairs of elevation levels and corresponding forecast data,
   *                        sorted by elevation level.
   * @param elevation       The elevation level we want to compute the wind for.
   * @param i               An index in `airDataSorted`
   * @param j               An index in `airDataSorted`
   */
  @tailrec
  private def interpolateWind(airDataSorted: IndexedSeq[(Length, AirData)], elevation: Length, i: Int, j: Int): Wind = {
    val (elevationAtI, atI) = airDataSorted(i)
    val (elevationAtJ, atJ) = airDataSorted(j)

    if (elevationAtI >= elevation) atI.wind
    else if (elevationAtJ <= elevation) atJ.wind
    else if (j - i == 1) {
      val q = (elevation - elevationAtI) / (elevationAtJ - elevationAtI)
      val u = atI.wind.u + (atJ.wind.u - atI.wind.u) * q
      val v = atI.wind.v + (atJ.wind.v - atI.wind.v) * q
      Wind(u, v)
    } else {
      val k = (i + j) / 2
      if (airDataSorted(k)._1 > elevation) interpolateWind(airDataSorted, elevation, i, k)
      else interpolateWind(airDataSorted, elevation, k, j)
    }
  }

}
