package org.soaringmeteo.gfs

import java.time.OffsetDateTime

import org.soaringmeteo.grib.Grib
import org.soaringmeteo._
import squants.energy.Grays
import squants.motion.{MetersPerSecond, Pascals}
import squants.radio.WattsPerSquareMeter
import squants.space.{Meters, Millimeters}
import squants.thermal.Kelvin

/**
  * Extract a [[GfsForecast]] for each of the given `locations`.
  */
object GfsGrib {

  def forecast(grib: Grib, locations: Seq[Point], time: OffsetDateTime): Map[Point, GfsForecast] = {
    import grib.Feature

    // You can see how the following variables were used here:
    // https://soaringmeteo.org/GFSw/helpProfile.pdf
    val hpblSurface = Feature("Planetary_Boundary_Layer_Height_surface")
    val hgtSurface = Feature("Geopotential_height_surface")
    val ugrdPlanetary = Feature("u-component_of_wind_planetary_boundary")
    val vgrdPlanetary = Feature("v-component_of_wind_planetary_boundary")
    val tcdcEntire =
      Feature
        .maybe("Total_cloud_cover_entire_atmosphere_3_Hour_Average")
        .getOrElse(Feature("Total_cloud_cover_entire_atmosphere_6_Hour_Average"))
    val tcdcLow =
      Feature
        .maybe("Total_cloud_cover_low_cloud_3_Hour_Average")
        .getOrElse(Feature("Total_cloud_cover_low_cloud_6_Hour_Average"))
    val tcdcMiddle =
      Feature
        .maybe("Total_cloud_cover_middle_cloud_3_Hour_Average")
        .getOrElse(Feature("Total_cloud_cover_middle_cloud_6_Hour_Average"))
    val tcdcHigh =
      Feature
        .maybe("Total_cloud_cover_high_cloud_3_Hour_Average")
        .getOrElse(Feature("Total_cloud_cover_high_cloud_6_Hour_Average"))
    // See also https://github.com/Boran/soaringmeteo/blob/46ba843c2fe22b69c66db30a97679a3d1fb34f35/src/makeGFSJs.pas#L912
    val tcdcConv = Feature("Total_cloud_cover_convective_cloud")
    val tcdcBoundary =
      Feature
        .maybe("Total_cloud_cover_boundary_layer_cloud_3_Hour_Average")
        .getOrElse(Feature("Total_cloud_cover_boundary_layer_cloud_6_Hour_Average"))

    val dswrfSurface =
      Feature
        .maybe("Downward_Short-Wave_Radiation_Flux_surface_3_Hour_Average")
        .getOrElse(Feature("Downward_Short-Wave_Radiation_Flux_surface_6_Hour_Average"))

    val hgt0 = Feature("Geopotential_height_zeroDegC_isotherm")

    val apcpSurface =
      Feature
        .maybe("Total_precipitation_surface_3_Hour_Accumulation")
        .orElse(Feature.maybe("Total_precipitation_surface_6_Hour_Accumulation"))
        .getOrElse(Feature("Total_precipitation_surface_Mixed_intervals_Accumulation"))
    val acpcpSurface =
      Feature
        .maybe("Convective_precipitation_surface_3_Hour_Accumulation")
        .orElse(Feature.maybe("Convective_precipitation_surface_6_Hour_Accumulation"))
        .getOrElse(Feature("Convective_precipitation_surface_Mixed_intervals_Accumulation"))

    val lhtflSurface =
      Feature
        .maybe("Latent_heat_net_flux_surface_3_Hour_Average")
        .getOrElse(Feature("Latent_heat_net_flux_surface_6_Hour_Average"))
    val shtflSurface =
      Feature
        .maybe("Sensible_heat_net_flux_surface_3_Hour_Average")
        .getOrElse(Feature("Sensible_heat_net_flux_surface_6_Hour_Average"))
    val capeSurface = Feature("Convective_available_potential_energy_surface")
    val cinSurface = Feature("Convective_inhibition_surface")

    val isobaricFeatures = GfsForecast.pressureLevels
      .map { pressureLevel =>
        val hgt = Feature("Geopotential_height_isobaric")
        val tmp = Feature("Temperature_isobaric")
        val rh = Feature("Relative_humidity_isobaric")
        val ugrd = Feature("u-component_of_wind_isobaric")
        val vgrd = Feature("v-component_of_wind_isobaric")
        pressureLevel -> ((hgt, tmp, rh, ugrd, vgrd))
      }
      .to(Map)

    val msletMean = Feature("MSLP_Eta_model_reduction_msl")
    val weasdSurface = Feature("Water_equivalent_of_accumulated_snow_depth_surface")

    val tmp2 = Feature("Temperature_height_above_ground")
    val rh2 = Feature("Relative_humidity_height_above_ground")

    val ugrd10 = Feature("u-component_of_wind_height_above_ground")
    val vgrd10 = Feature("v-component_of_wind_height_above_ground")

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
