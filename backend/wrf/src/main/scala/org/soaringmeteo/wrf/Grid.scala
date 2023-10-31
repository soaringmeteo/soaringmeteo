package org.soaringmeteo.wrf


case class Grid(outputPath: String, label: String)

object Grid {

  val all: Map[String, Grid] = Map(
    "d02" -> Grid("alps-overview", "Alps Overview"),
    "d03" -> Grid("central-alps", "Central Alps"),
    "d04" -> Grid("southern-alps", "Southern Alps"),
    "d05" -> Grid("eastern-alps", "Eastern Alps"),
  )

  def find(netCdfPath: os.Path): Grid = {
    val id = netCdfPath.last.stripPrefix("wrfout_").take(3)
    all.getOrElse(id, sys.error(s"Unregistered grid for input file ${netCdfPath.last}"))
  }

}
