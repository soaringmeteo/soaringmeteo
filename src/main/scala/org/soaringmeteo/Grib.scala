package org.soaringmeteo

import java.time.OffsetDateTime

import squants.energy.Grays
import squants.motion.{MetersPerSecond, Pascals}
import squants.radio.WattsPerSquareMeter
import squants.space.{Meters, Millimeters}
import squants.thermal.Kelvin
import ucar.ma2.ArrayFloat
import ucar.nc2.dt.grid.{GeoGrid, GridDataset}

import scala.util.Using

/**
 * Convenient class for manipulating GRIB files.
 *
 * TODO Handle errors.
 */
class Grib(data: GridDataset) {

  /**
   * @param grid Forecast data such as boundary layer height, wind force, etc.
   */
  case class Feature(grid: GeoGrid) {
    // Important: we pre-fetch all the data into memory, otherwise the execution is very slow due to file IOs
    private val data = grid.readDataSlice(/* t = */ -1, /* z = */ -1, /* y = */ -1, /* x = */ -1)

    /** Assumes that the feature has 3 or 4 dimensions (where the time and elevation have only one possible value) */
    def read(location: GfsLocation): Double = {
      val (x, y) = getXYCoordinates(location)
      data match {
        case d3: ArrayFloat.D3 => d3.get(/* t = */ 0, y, x)
        case d4: ArrayFloat.D4 => d4.get(/* t = */ 0, /* z = */ 0, y, x)
      }
    }

    /** Assumes that the feature has 4 dimensions (where the time has only one possible value) */
    def read(location: GfsLocation, elevation: Double): Double = {
      val (x, y) = getXYCoordinates(location)
      val z = grid.getCoordinateSystem.getVerticalAxis.findCoordElement(elevation)
      data.asInstanceOf[ArrayFloat.D4].get(/* t = */ 0, z, y, x)
    }

    private def getXYCoordinates(location: GfsLocation): (Int, Int) = {
      val Array(x, y) =
        grid
          .getCoordinateSystem
          .findXYindexFromLatLon(location.latitude.doubleValue, location.longitude.doubleValue, null)
      (x, y)
    }

  }

  object Feature {

    def apply(name: String): Feature = maybe(name).get

    def maybe(name: String): Option[Feature] =
      Option(data.findGridByShortName(name)).map(Feature(_))

  }

  // You can see how the following variables were used here:
  // https://soaringmeteo.org/GFSw/helpProfile.pdf
  private val hpblSurface = Feature("Planetary_Boundary_Layer_Height_surface")
  private val hgtSurface = Feature("Geopotential_height_surface")
  private val ugrdPlanetary = Feature("u-component_of_wind_planetary_boundary")
  private val vgrdPlanetary = Feature("v-component_of_wind_planetary_boundary")
  private val tcdcEntire =
    Feature.maybe("Total_cloud_cover_entire_atmosphere_3_Hour_Average")
      .getOrElse(Feature("Total_cloud_cover_entire_atmosphere_6_Hour_Average"))
  private val tcdcLow =
    Feature.maybe("Total_cloud_cover_low_cloud_3_Hour_Average")
      .getOrElse(Feature("Total_cloud_cover_low_cloud_6_Hour_Average"))
  private val tcdcMiddle =
    Feature.maybe("Total_cloud_cover_middle_cloud_3_Hour_Average")
      .getOrElse(Feature("Total_cloud_cover_middle_cloud_6_Hour_Average"))
  private val tcdcHigh =
    Feature.maybe("Total_cloud_cover_high_cloud_3_Hour_Average")
      .getOrElse(Feature("Total_cloud_cover_high_cloud_6_Hour_Average"))
  // See also https://github.com/Boran/soaringmeteo/blob/46ba843c2fe22b69c66db30a97679a3d1fb34f35/src/makeGFSJs.pas#L912
  private val tcdcConv = Feature("Total_cloud_cover_convective_cloud")
  private val tcdcBoundary =
    Feature.maybe("Total_cloud_cover_boundary_layer_cloud_3_Hour_Average")
      .getOrElse(Feature("Total_cloud_cover_boundary_layer_cloud_6_Hour_Average"))

  private val dswrfSurface =
    Feature.maybe("Downward_Short-Wave_Radiation_Flux_surface_3_Hour_Average")
      .getOrElse(Feature("Downward_Short-Wave_Radiation_Flux_surface_6_Hour_Average"))

  private val hgt0 = Feature("Geopotential_height_zeroDegC_isotherm")

  private val apcpSurface =
    Feature.maybe("Total_precipitation_surface_3_Hour_Accumulation")
      .orElse(Feature.maybe("Total_precipitation_surface_6_Hour_Accumulation"))
      .getOrElse(Feature("Total_precipitation_surface_Mixed_intervals_Accumulation"))
  private val acpcpSurface =
    Feature.maybe("Convective_precipitation_surface_3_Hour_Accumulation")
      .orElse(Feature.maybe("Convective_precipitation_surface_6_Hour_Accumulation"))
      .getOrElse(Feature("Convective_precipitation_surface_Mixed_intervals_Accumulation"))

  private val lhtflSurface =
    Feature.maybe("Latent_heat_net_flux_surface_3_Hour_Average")
      .getOrElse(Feature("Latent_heat_net_flux_surface_6_Hour_Average"))
  private val shtflSurface =
    Feature.maybe("Sensible_heat_net_flux_surface_3_Hour_Average")
      .getOrElse(Feature("Sensible_heat_net_flux_surface_6_Hour_Average"))
  private val capeSurface = Feature("Convective_available_potential_energy_surface")
  private val cinSurface = Feature("Convective_inhibition_surface")

  private val isobaricFeatures = GfsForecast.pressureLevels.map { pressureLevel =>
    val hgt = Feature("Geopotential_height_isobaric")
    val tmp = Feature("Temperature_isobaric")
    val rh = Feature("Relative_humidity_isobaric")
    val ugrd = Feature("u-component_of_wind_isobaric")
    val vgrd = Feature("v-component_of_wind_isobaric")
    pressureLevel -> ((hgt, tmp, rh, ugrd, vgrd))
  }.to(Map)

  private val msletMean = Feature("MSLP_Eta_model_reduction_msl")
  private val weasdSurface = Feature("Water_equivalent_of_accumulated_snow_depth_surface")

  private val tmp2 = Feature("Temperature_height_above_ground")
  private val rh2 = Feature("Relative_humidity_height_above_ground")

  private val ugrd10 = Feature("u-component_of_wind_height_above_ground")
  private val vgrd10 = Feature("v-component_of_wind_height_above_ground")

  /**
   * Extract a [[GfsForecast]] for each of the given `locations`.
   */
  def forecast(locations: Seq[GfsLocation], time: OffsetDateTime): Map[Point, GfsForecast] = {
    (for (location <- locations) yield {
      // Read the value of the given `grid` at the current `location`
      def readXY(feature: Feature): Double = feature.read(location)

      val isobaricVariables = isobaricFeatures.map { case (pressure, (hgt, tmp, rh, ugrd, vgrd)) =>
        // Read the value of the given `grid` at the current `location` and `pressure` level
        def readXYZ(feature: Feature) = feature.read(location, pressure.toPascals)

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
        time = time,
        elevation = Meters(readXY(hgtSurface)),
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
        cape = Grays(readXY(capeSurface)),
        cin = Grays(readXY(cinSurface)),
        downwardShortWaveRadiationFlux = WattsPerSquareMeter(readXY(dswrfSurface)),
        isothermZero = Meters(readXY(hgt0))
      )
      val point = Point(location.latitude, location.longitude)
      point -> gfsForecast
    }).toMap
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
