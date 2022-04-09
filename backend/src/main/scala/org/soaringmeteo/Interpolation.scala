package org.soaringmeteo

import squants.Quantity

import scala.annotation.tailrec

object Interpolation {

  // Convenient shortcut for quantities
  def interpolateSortedSeqQuantities[X <: Quantity[X], Y <: Quantity[Y]](
    sortedKnownDataPoints: IndexedSeq[(X, Y)],
    x: X
  ): Y =
    interpolateSortedSeq(
      sortedKnownDataPoints,
      x
    )(
      _ - _,
      _ / _,
      _ * _,
      _ + _,
      _ - _
    )

  /**
   * Estimates a function value from a set of known data points.
   *
   * The function finds the two points of the known data points that are
   * the closest to the point to estimate, and estimates the function value
   * by using the linear interpolant between those two points.
   *
   * @param sortedKnownDataPoints Set of known data points (pairs of `(X, Y)` values),
   *                      sorted by `X`.
   * @param scaleY        Function multiplying a value of type `Y` by a scalar
   *                      value.
   * @param x             The element for which to guess the function value.
   * @tparam X Domain of the function
   * @tparam Y Codomain of the function
   * @return An estimation of the function value for `x`.
   */
  def interpolateSortedSeq[X, Y](
    sortedKnownDataPoints: IndexedSeq[(X, Y)],
    x: X
  )(
    subtractX: (X, X) => X,
    divideX: (X, X) => Double,
    scaleY: (Y, Double) => Y,
    addY: (Y, Y) => Y,
    subtractY: (Y, Y) => Y
  )(implicit ordering: Ordering[X]): Y = {
    @tailrec
    def loop(i: Int, j: Int): Y = {
      assert(i < j)
      import Ordering.Implicits.infixOrderingOps
      val (x0, y0) = sortedKnownDataPoints(i)
      val (x1, y1) = sortedKnownDataPoints(j)
      // If the element to estimate is less than the smallest data point,
      // return the function value for that data point.
      if (x <= x0) y0
      // Similarly, if the element to estimate is greater than the highest
      // data point, return the function value for that data point.
      else if (x >= x1) y1
      // If we found the two closest data points, interpolate them.
      else if (j - i == 1) {
        val q = divideX(subtractX(x, x0), subtractX(x1, x0))
        addY(y0, scaleY(subtractY(y1, y0), q))
      } else {
        // Otherwise, cut the known data points in half.
        val k = (i + j) / 2
        if (sortedKnownDataPoints(k)._1 > x) loop(i, k)
        else loop(k, j)
      }
    }
    loop(0, sortedKnownDataPoints.size - 1)
  }

}
