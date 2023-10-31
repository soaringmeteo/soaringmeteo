package org.soaringmeteo.gfs.in

import squants.motion.{Pascals, Pressure}

object IsobaricVariables {
  val pressureLevels: Seq[Pressure] =
    Seq(20000, 30000, 40000, 45000, 50000, 55000, 60000, 65000, 70000, 75000, 80000, 85000, 90000, 92500, 95000, 97500, 100000)
      .map(Pascals(_))
}
