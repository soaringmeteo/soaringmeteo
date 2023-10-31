package org.soaringmeteo

import verify.BasicTestSuite
import Ordering.Double.IeeeOrdering

object InterpolationTestSuite extends BasicTestSuite {

  def interpolateDoubles(dataPoints: IndexedSeq[(Double, Double)], x: Double): Double =
    Interpolation.interpolateSortedSeq(
      dataPoints,
      x
    )(
      _- _,
      _ / _,
      _ * _,
      _ + _,
      _ - _
    )

  test("Element lower than smallest known data point") {
    val dataPoints = IndexedSeq(10.0 -> 1.0, 20.0 -> 2.0)
    val x = 3.0
    assert(interpolateDoubles(dataPoints, x) == 1.0)
  }

  test("Element greater than highest known data point") {
    val dataPoints = IndexedSeq(10.0 -> 1.0, 20.0 -> 2.0)
    val x = 35.4
    assert(interpolateDoubles(dataPoints, x) == 2.0)
  }

  test("Interpolated element (1)") {
    val dataPoints = IndexedSeq(10.0 -> 1.0, 20.0 -> 2.0)
    val x = 12.0
    assert(interpolateDoubles(dataPoints, x) == 1.2)
  }

  test("Interpolated element (2)") {
    val dataPoints = IndexedSeq(
      10.0 -> 1.0,
      20.0 -> 2.0,
      30.0 -> 3.0
    )
    val x = 12.0
    assert(interpolateDoubles(dataPoints, x) == 1.2)
  }

  test("Interpolated element (3)") {
    val dataPoints = IndexedSeq(
      10.0 -> 1.0,
      20.0 -> 2.0,
      30.0 -> 3.0
    )
    val x = 24.0
    assert(interpolateDoubles(dataPoints, x) == 2.4)
  }

  test("Interpolated element (4)") {
    val dataPoints = IndexedSeq(
      10.0 -> 1.0,
      20.0 -> 2.0,
      30.0 -> 3.0,
      40.0 -> 4.0,
      50.0 -> 5.0
    )
    val x = 24.0
    assert(interpolateDoubles(dataPoints, x) == 2.4)
  }

  test("Interpolated element (5)") {
    val dataPoints = IndexedSeq(
      10.0 -> 1.0,
      20.0 -> 2.0,
      30.0 -> 3.0,
      40.0 -> 4.0,
      50.0 -> 5.0
    )
    val x = 20.0
    assert(interpolateDoubles(dataPoints, x) == 2.0)
  }

  test("Interpolated element (6)") {
    val dataPoints = IndexedSeq(
      10.0 -> 1.0,
      20.0 -> 2.0,
      30.0 -> 3.0,
      40.0 -> 4.0,
      50.0 -> 5.0,
      60.0 -> 6.0
    )
    val x = 58.0
    assert(interpolateDoubles(dataPoints, x) == 5.8)
  }

  test("Interpolated element (6)") {
    val dataPoints = IndexedSeq(
      10.0 -> 1.0,
      20.0 -> 2.0,
      30.0 -> 3.0,
      40.0 -> 4.0,
      50.0 -> 5.0,
      60.0 -> 6.0
    )
    val x = 40.0
    assert(interpolateDoubles(dataPoints, x) == 4.0)
  }

}
