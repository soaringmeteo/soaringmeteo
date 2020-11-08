package org.soaringmeteo

import eu.timepit.refined.refineV
import org.soaringmeteo.gfs.GfsLocation
import squants.radio.WattsPerSquareMeter
import squants.space.Meters
import verify.BasicTestSuite

object GfsLocationTestSuite extends BasicTestSuite {

  test("GfsLocation.parse") {
    val locations = GfsLocation.parse(
      """Mont Blanc-Verbier,70,460,1934,1,2,68,214,284,608,792,920
        |Gruyère-Riviera,70,465,1016,1,2,60,196,264,592,768,892
        |Invalid entry,a,b,,
        |Neuchâtel,70,470,767,1,2,54,182,244,584,760,872
        |""".stripMargin)
    val expected  = Seq(
      GfsLocation("Mont Blanc-Verbier", 7.0, 46.0, Meters(1934), 1, 2, WattsPerSquareMeter(68), WattsPerSquareMeter(214), WattsPerSquareMeter(284), WattsPerSquareMeter(608), WattsPerSquareMeter(792), WattsPerSquareMeter(920)),
      GfsLocation("Gruyère-Riviera",    7.0, 46.5, Meters(1016), 1, 2, WattsPerSquareMeter(60), WattsPerSquareMeter(196), WattsPerSquareMeter(264), WattsPerSquareMeter(592), WattsPerSquareMeter(768), WattsPerSquareMeter(892)),
      GfsLocation("Neuchâtel",          7.0, 47.0, Meters(767),  1, 2, WattsPerSquareMeter(54), WattsPerSquareMeter(182), WattsPerSquareMeter(244), WattsPerSquareMeter(584), WattsPerSquareMeter(760), WattsPerSquareMeter(872))
    )
    assert(locations == expected)
  }

  test("forecastTimeOffsets") {
    val location =
      GfsLocation("Mont Blanc-Verbier", 7.0, 46.0, Meters(1934), 1, 2, WattsPerSquareMeter(68), WattsPerSquareMeter(214), WattsPerSquareMeter(284), WattsPerSquareMeter(608), WattsPerSquareMeter(792), WattsPerSquareMeter(920))

    val forecastTimeOffsets0 =
      location.forecastTimeOffsets(refineV.unsafeFrom(0))
    assert(forecastTimeOffsets0.startsWith(Seq(9, 12, 15, 33, 36, 39)))
  }

}
