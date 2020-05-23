package org.soaringmeteo

import squants.motion.{MetersPerSecond, Pascals}
import squants.radio.WattsPerSquareMeter
import squants.space.{Meters, Millimeters}
import squants.thermal.Kelvin
import ucar.nc2.dt.grid.{GeoGrid, GridDataset}

import scala.util.Using

/**
 * Convenient class for manipulating GRIB files.
 *
 * TODO Handle errors.
 */
class Grib(data: GridDataset) {

  // You can see how the following variables were used here:
  // https://soaringmeteo.org/GFSw/helpProfile.pdf
  private val hpblSurface = feature("Planetary_Boundary_Layer_Height_surface")
  private val ugrdPlanetary = feature("u-component_of_wind_planetary_boundary")
  private val vgrdPlanetary = feature("v-component_of_wind_planetary_boundary")
  private val tcdcEntire =
    maybeFeature("Total_cloud_cover_entire_atmosphere_3_Hour_Average")
      .getOrElse(feature("Total_cloud_cover_entire_atmosphere_6_Hour_Average"))
  private val tcdcLow =
    maybeFeature("Total_cloud_cover_low_cloud_3_Hour_Average")
      .getOrElse(feature("Total_cloud_cover_low_cloud_6_Hour_Average"))
  private val tcdcMiddle =
    maybeFeature("Total_cloud_cover_middle_cloud_3_Hour_Average")
      .getOrElse(feature("Total_cloud_cover_middle_cloud_6_Hour_Average"))
  private val tcdcHigh =
    maybeFeature("Total_cloud_cover_high_cloud_3_Hour_Average")
      .getOrElse(feature("Total_cloud_cover_high_cloud_6_Hour_Average"))
  // See also https://github.com/Boran/soaringmeteo/blob/46ba843c2fe22b69c66db30a97679a3d1fb34f35/src/makeGFSJs.pas#L912
  private val tcdcConv = feature("Total_cloud_cover_convective_cloud")
  private val tcdcBoundary =
    maybeFeature("Total_cloud_cover_boundary_layer_cloud_3_Hour_Average")
      .getOrElse(feature("Total_cloud_cover_boundary_layer_cloud_6_Hour_Average"))

  private val dswrfSurface =
    maybeFeature("Downward_Short-Wave_Radiation_Flux_surface_3_Hour_Average")
      .getOrElse(feature("Downward_Short-Wave_Radiation_Flux_surface_6_Hour_Average"))

  private val hgt0 = feature("Geopotential_height_zeroDegC_isotherm")

  private val apcpSurface =
    maybeFeature("Total_precipitation_surface_3_Hour_Accumulation")
      .orElse(maybeFeature("Total_precipitation_surface_6_Hour_Accumulation"))
      .getOrElse(feature("Total_precipitation_surface_Mixed_intervals_Accumulation"))
  private val acpcpSurface =
    maybeFeature("Convective_precipitation_surface_3_Hour_Accumulation")
      .orElse(maybeFeature("Convective_precipitation_surface_6_Hour_Accumulation"))
      .getOrElse(feature("Convective_precipitation_surface_Mixed_intervals_Accumulation"))

  private val lhtflSurface =
    maybeFeature("Latent_heat_net_flux_surface_3_Hour_Average")
      .getOrElse(feature("Latent_heat_net_flux_surface_6_Hour_Average"))
  private val shtflSurface =
    maybeFeature("Sensible_heat_net_flux_surface_3_Hour_Average")
      .getOrElse(feature("Sensible_heat_net_flux_surface_6_Hour_Average"))
  private val capeSurface = feature("Convective_available_potential_energy_surface")
  private val cinSurface = feature("Convective_inhibition_surface")

  private val isobaricFeatures = GfsForecast.pressureLevels.map { pressureLevel =>
    val hgt = feature("Geopotential_height_isobaric")
    val tmp = feature("Temperature_isobaric")
    val rh = feature("Relative_humidity_isobaric")
    val ugrd = feature("u-component_of_wind_isobaric")
    val vgrd = feature("v-component_of_wind_isobaric")
    pressureLevel -> ((hgt, tmp, rh, ugrd, vgrd))
  }.to(Map)

  private val msletMean = feature("MSLP_Eta_model_reduction_msl")
  private val weasdSurface = feature("Water_equivalent_of_accumulated_snow_depth_surface")

  private val tmp2 = feature("Temperature_height_above_ground")
  private val rh2 = feature("Relative_humidity_height_above_ground")

  private val ugrd10 = feature("u-component_of_wind_height_above_ground")
  private val vgrd10 = feature("v-component_of_wind_height_above_ground")

  /**
   * Extract a [[GfsForecast]] for each of the given `locations`.
   */
  def forecast(locations: Seq[GfsLocation]): Map[Point, GfsForecast] = {
    (for (location <- locations) yield {
      // Read the value of the given `grid` at the current `location`
      def readXY(grid: GeoGrid): Double = {
        val (x, y) = getXYCoordinates(grid, location)
        grid.readDataSlice(0, -1, y, x).getDouble(0)
      }

      val isobaricVariables = isobaricFeatures.map { case (pressure, (hgt, tmp, rh, ugrd, vgrd)) =>
        // Read the value of the given `grid` at the current `location` and `pressure` level
        def readXYZ(grid: GeoGrid) = {
          val (x, y) = getXYCoordinates(grid, location)
          val z = grid.getCoordinateSystem.getVerticalAxis.findCoordElement(pressure.toPascals)
          grid.readDataSlice(0, z, y, x).getDouble(0)
        }

        pressure -> IsobaricVariables(
          Meters(readXYZ(hgt)),
          Kelvin(readXYZ(tmp)),
          readXYZ(rh),
          Wind(
            MetersPerSecond(readXYZ(ugrd)),
            MetersPerSecond(readXYZ(vgrd))
          )
        )
      }

      val gfsForecast = GfsForecast(
        boundaryLayerHeight = Meters(readXY(hpblSurface)),
        boundaryLayerWind = Wind(
          MetersPerSecond(readXY(ugrdPlanetary)),
          MetersPerSecond(readXY(vgrdPlanetary))
        ),
        cloudCover = CloudCover(
          readXY(tcdcEntire),
          readXY(tcdcLow),
          readXY(tcdcMiddle),
          readXY(tcdcHigh),
          readXY(tcdcConv),
          readXY(tcdcBoundary)
        ),
        atPressure = isobaricVariables,
        mslet = Pascals(readXY(msletMean)),
        snowDepth = Millimeters(readXY(weasdSurface)), // kg/m² <=> mm (for water)
        surfaceTemperature = Kelvin(readXY(tmp2)),
        surfaceRelativeHumidity = readXY(rh2),
        surfaceWind = Wind(
          MetersPerSecond(readXY(ugrd10)),
          MetersPerSecond(readXY(vgrd10))
        ),
        accumulatedRain = Millimeters(readXY(apcpSurface)),
        accumulatedConvectiveRain = Millimeters(readXY(acpcpSurface)),
        latentHeatNetFlux = WattsPerSquareMeter(readXY(lhtflSurface)),
        sensibleHeatNetFlux = WattsPerSquareMeter(readXY(shtflSurface)),
        cape = readXY(capeSurface),
        cin = readXY(cinSurface),
        downwardShortWaveRadiationFlux = WattsPerSquareMeter(readXY(dswrfSurface)),
        isothermZero = Meters(readXY(hgt0))
      )
      val point = Point(location.latitude, location.longitude)
      point -> gfsForecast
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
