package org.soaringmeteo

import squants.motion.{KilometersPerHour, MetersPerSecond}
import squants.{Length, Meters, Velocity}
import verify.BasicTestSuite

/** This is not really a test, but rather a way to list the XC potential values
 *  for some input parameters
 */
object XCFlyingPotentialTestSuite extends BasicTestSuite {

  case class Parameters(
    thermalVelocity: Velocity,
    soaringLayerDepth: Length,
    boundaryLayerWindSpeed: Velocity,
    surfaceWindSpeed: Velocity
  )

  test("XC flying potential index has relevant values") {
    // Define the expected results for various parameter values
    val data: Seq[(Parameters, XCFlyingPotential)] =
      Seq(
        // Great conditions
        Parameters(
          MetersPerSecond(3.5),
          Meters(1000),
          KilometersPerHour(0),
          KilometersPerHour(0)
        ) -> XCFlyingPotential(mountains = 100, flatlands = 100),
        // Playing with wind in the boundary layer
        Parameters(
          MetersPerSecond(2.5),
          Meters(800),
          KilometersPerHour(5),
          KilometersPerHour(0),
        ) -> XCFlyingPotential(95, 96),
        Parameters(
          MetersPerSecond(2.5),
          Meters(800),
          KilometersPerHour(10),
          KilometersPerHour(0)
        ) -> XCFlyingPotential(87, 96),
        Parameters(
          MetersPerSecond(2.5),
          Meters(800),
          KilometersPerHour(15),
          KilometersPerHour(0)
        ) -> XCFlyingPotential(57, 95),
        Parameters(
          MetersPerSecond(2.5),
          Meters(800),
          KilometersPerHour(20),
          KilometersPerHour(0)
        ) -> XCFlyingPotential(18, 94),
        Parameters(
          MetersPerSecond(2.5),
          Meters(800),
          KilometersPerHour(30),
          KilometersPerHour(0)
        ) -> XCFlyingPotential(1, 88),
        Parameters(
          MetersPerSecond(2.5),
          Meters(800),
          KilometersPerHour(40),
          KilometersPerHour(10),
        ) -> XCFlyingPotential(0, 66),
        Parameters(
          MetersPerSecond(2.5),
          Meters(800),
          KilometersPerHour(50),
          KilometersPerHour(10),
        ) -> XCFlyingPotential(0, 30),
        Parameters(
          MetersPerSecond(2.5),
          Meters(800),
          KilometersPerHour(60),
          KilometersPerHour(10),
        ) -> XCFlyingPotential(0, 8),
        // Playing with wind on the ground
        Parameters(
          MetersPerSecond(2.5),
          Meters(800),
          KilometersPerHour(10),
          KilometersPerHour(10),
        ) -> XCFlyingPotential(87, 96),
        Parameters(
          MetersPerSecond(2.5),
          Meters(800),
          KilometersPerHour(10),
          KilometersPerHour(15)
        ) -> XCFlyingPotential(87, 94),
        Parameters(
          MetersPerSecond(2.5),
          Meters(800),
          KilometersPerHour(10),
          KilometersPerHour(20)
        ) -> XCFlyingPotential(87, 90),
        Parameters(
          MetersPerSecond(2.5),
          Meters(800),
          KilometersPerHour(10),
          KilometersPerHour(30)
        ) -> XCFlyingPotential(87, 48),
        Parameters(
          MetersPerSecond(2.5),
          Meters(800),
          KilometersPerHour(10),
          KilometersPerHour(40)
        ) -> XCFlyingPotential(87, 6),
        // Playing with thermal velocity
        Parameters(
          MetersPerSecond(2.0),
          Meters(800),
          KilometersPerHour(5),
          KilometersPerHour(0),
        ) -> XCFlyingPotential(85, 87),
        Parameters(
          MetersPerSecond(1.5),
          Meters(800),
          KilometersPerHour(5),
          KilometersPerHour(0),
        ) -> XCFlyingPotential(62, 63),
        Parameters(
          MetersPerSecond(1.0),
          Meters(800),
          KilometersPerHour(5),
          KilometersPerHour(0),
        ) -> XCFlyingPotential(42, 42),
        Parameters(
          MetersPerSecond(3.0),
          Meters(800),
          KilometersPerHour(5),
          KilometersPerHour(0),
        ) -> XCFlyingPotential(97, 99),
        // Playing with soaring layer depth
        Parameters(
          MetersPerSecond(2.5),
          Meters(1200),
          KilometersPerHour(5),
          KilometersPerHour(0),
        ) -> XCFlyingPotential(95, 97),
        Parameters(
          MetersPerSecond(2.5),
          Meters(2000),
          KilometersPerHour(5),
          KilometersPerHour(0),
        ) -> XCFlyingPotential(95, 97),
        Parameters(
          MetersPerSecond(2.5),
          Meters(400),
          KilometersPerHour(5),
          KilometersPerHour(0),
        ) -> XCFlyingPotential(79, 80),
      )

    for ((param, expectedResult) <- data) {
      val result = XCFlyingPotential(param.thermalVelocity, param.soaringLayerDepth, param.boundaryLayerWindSpeed, param.surfaceWindSpeed)
      assert(result == expectedResult)
    }
  }

}
