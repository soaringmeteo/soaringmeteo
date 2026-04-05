package org.soaringmeteo.build

import sbt.internal.util.complete.Parser

object Servers {
  val soarwrf3 = "soarwrf3"
  val soarwrf4 = "soarwrf4"

  /** Fully qualified hostname for a given server id */
  def host(server: String): String = s"${server}.soaringmeteo.org"

  /** sbt parser that accepts any known server instance name */
  val instanceParser: Parser[String] = {
    import sbt.complete.DefaultParsers.*
    literal(soarwrf3) | literal(soarwrf4)
  }
}

