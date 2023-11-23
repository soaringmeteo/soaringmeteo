package org.soaringmeteo.wrf


/**
 * @param outputPath     Unique output path (e.g. "central-alps")
 * @param label          Human readable label (e.g. "Central Alps")
 * @param vectorTileSize Size of the vector tiles for that grid (default is 512, but fine-tuning this value
 *                       allows us to adjust the density of wind arrows)
 */
case class Grid(outputPath: String, label: String, vectorTileSize: Int)

object Grid {

  val all: Map[String, Grid] = Map(
    "d02" -> Grid("alps-overview", "Alps Overview", 450),
    "d03" -> Grid("central-alps", "Central Alps", 350),
    "d04" -> Grid("southern-alps", "Southern Alps", 350),
    "d05" -> Grid("eastern-alps", "Eastern Alps", 400),
  )

  def find(netCdfPath: os.Path): Grid = {
    val id = netCdfPath.last.stripPrefix("wrfout_").take(3)
    all.getOrElse(id, sys.error(s"Unregistered grid for input file ${netCdfPath.last}"))
  }

}
