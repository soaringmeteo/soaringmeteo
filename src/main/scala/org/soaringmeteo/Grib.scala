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
    // HPBL:surface
    val hpbl = feature("Planetary_Boundary_Layer_Height_surface")
    // UGRD:planetary
    val ugrd = feature("u-component_of_wind_planetary_boundary")
    // VGRD:planetary
    val vgrd = feature("v-component_of_wind_planetary_boundary")
    // TCDC:entire
    val tcdcEntire =
      maybeFeature("Total_cloud_cover_entire_atmosphere_3_Hour_Average")
        .getOrElse(feature("Total_cloud_cover_entire_atmosphere_6_Hour_Average"))
    // TCDC:low
    val tcdcLow =
      maybeFeature("Total_cloud_cover_low_cloud_3_Hour_Average")
        .getOrElse(feature("Total_cloud_cover_low_cloud_6_Hour_Average"))
    // TCDC:middle
    val tcdcMiddle =
      maybeFeature("Total_cloud_cover_middle_cloud_3_Hour_Average")
        .getOrElse(feature("Total_cloud_cover_middle_cloud_6_Hour_Average"))
    // TCDC:high
    val tcdcHigh =
      maybeFeature("Total_cloud_cover_high_cloud_3_Hour_Average")
        .getOrElse(feature("Total_cloud_cover_high_cloud_6_Hour_Average"))

    // TODO The following variables were used by the old soarGFS implementation
    // You can see how they were used here: https://soaringmeteo.org/GFSw/helpProfile.pdf
    // -- Cloud Cover
    // "Total_cloud_cover_convective_cloud" (TCDC:convective) See also https://github.com/Boran/soaringmeteo/blob/46ba843c2fe22b69c66db30a97679a3d1fb34f35/src/makeGFSJs.pas#L912
    // "Total_cloud_cover_boundary_layer_cloud_3_Hour_Average" (TCDC:boundary)
    // -- Solar Radiation
    // "Downward_Short-Wave_Radiation_Flux_surface_3_Hour_Average" (DSWRF:surface)
    // -- 0°C Isotherm
    // "Geopotential_height_zeroDegC_isotherm" (HGT:0C)
    // -- Thunder & Rain
    // "Total_precipitation_surface_3_Hour_Accumulation" (APCP:surface)
    // "Convective_precipitation_surface_3_Hour_Accumulation" (ACPCP:surface)
    // "Latent_heat_net_flux_surface_3_Hour_Average" (LHTFL:surface)
    // "Sensible_heat_net_flux_surface_3_Hour_Average" (SHTFL:surface)
    // "Convective_available_potential_energy_surface" (CAPE:surface)
    // "Convective_inhibition_surface" (CIN:surface)
    // -- Sounding
    // "Geopotential_height_isobaric" (HGT:200-950)
    // "Temperature_isobaric" (TMP:200-950)
    // "Relative_humidity_isobaric" (RH:200-950)
    // "u-component_of_wind_isobaric" (UGRD:400-950)
    // "v-component_of_wind_isobaric" (VGRD:400-950)
    // "MSLP_Eta_model_reduction_msl" (MSLET:mean)
    // "Water_equivalent_of_accumulated_snow_depth_surface" (WEASD:surface)
    // "Temperature_height_above_ground" (TMP:2)

    (for (location <- locations) yield {
      val u = getXYFeatureAsDouble(ugrd, location) * 60 * 60 / 1000
      val v = getXYFeatureAsDouble(vgrd, location) * 60 * 60 / 1000
      val blh = getXYFeatureAsDouble(hpbl, location).round.toInt
      val cloudCover = CloudCover(
        getXYFeatureAsDouble(tcdcEntire, location),
        getXYFeatureAsDouble(tcdcLow, location),
        getXYFeatureAsDouble(tcdcMiddle, location),
        getXYFeatureAsDouble(tcdcHigh, location)
      )
      val point = Point(location.latitude, location.longitude)
      point -> GfsForecast(blh, Wind(u, v), cloudCover)
    }).toMap
  }

  private def feature(name: String): GeoGrid = maybeFeature(name).get

  private def maybeFeature(name: String): Option[GeoGrid] = Option(data.findGridByShortName(name))

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
