package org.soaringmeteo

import ucar.nc2.dt.grid.{GeoGrid, GridDataset}

import scala.util.Using

/**
 * Convenient class for manipulating GRIB files.
 *
 * TODO Handle errors.
 */
class Grib(data: GridDataset) {

  /**
   * Extract a [[GfsForecast]] for each of the given `locations`.
   */
  def forecast(locations: Seq[GfsLocation]): Map[Point, GfsForecast] = {
    val hpbl = Option(data.findGridByShortName("Planetary_Boundary_Layer_Height_surface")).get
    val ugrd = Option(data.findGridByShortName("u-component_of_wind_planetary_boundary")).get
    val vgrd = Option(data.findGridByShortName("v-component_of_wind_planetary_boundary")).get
    val tcdc = Option(data.findGridByShortName("Total_cloud_cover_entire_atmosphere_6_Hour_Average"))
    (for (location <- locations) yield {
      val u = getXYFeatureAsDouble(ugrd, location) * 60 * 60 / 1000
      val v = getXYFeatureAsDouble(vgrd, location) * 60 * 60 / 1000
      val blh = getXYFeatureAsDouble(hpbl, location).round.toInt
      val cloudCover = tcdc.map(getXYFeatureAsDouble(_, location))
      val point = Point(location.latitude, location.longitude)
      point -> GfsForecast(blh, Wind(u, v), cloudCover)
    }).toMap
  }

  private def getXYCoordinates(feature: GeoGrid, location: GfsLocation): (Int, Int) = {
    val Array(x, y) =
      feature
        .getCoordinateSystem
        .findXYindexFromLatLon(location.latitude.doubleValue, location.longitude.doubleValue, null)
    (x, y)
  }

  private def getXYFeatureAsDouble(feature: GeoGrid, location: GfsLocation): Double = {
    val (x, y) = getXYCoordinates(feature, location)
    feature.readDataSlice(0, -1, y, x).getDouble(0)
  }

}

object Grib {

  /**
   * Open a GRIB file, do something with it, and close it.
   */
  def bracket[A](file: os.Path)(f: Grib => A): A =
    Using.resource(GridDataset.open(file.toIO.getAbsolutePath)) { data =>
      f(new Grib(data))
    }

}
