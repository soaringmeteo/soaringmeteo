package org.soaringmeteo.gfs.in

import org.slf4j.LoggerFactory
import org.soaringmeteo.Temperatures.dewPoint

import java.time.OffsetDateTime
import org.soaringmeteo.grib.Grib
import org.soaringmeteo.{ ConvectiveClouds, Forecast, Point, Thermals, Wind, Winds, XCFlyingPotential }
import org.soaringmeteo.gfs.Subgrid
import squants.{Length, Temperature}
import squants.energy.{Grays, SpecificEnergy}
import squants.motion.{MetersPerSecond, Pascals, Pressure}
import squants.radio.{Irradiance, WattsPerSquareMeter}
import squants.space.{Meters, Millimeters}
import squants.thermal.Kelvin

import scala.collection.SortedMap

/**
  * Extract a [[org.soaringmeteo.Forecast]] for each of the given `locations`.
  */
object GfsGrib {

  private val logger = LoggerFactory.getLogger(getClass)

  /**
   * @param gribFile             GRIB file to read
   * @param forecastInitDateTime Initialization time of the forecast
   * @param forecastHourOffset   Time of forecast we want to extract, in number of hours
   *                             from the forecast initialization (e.g., 0, 3, 6, etc.)
   * @param subgrid              Part of the GFS data that we want to extract
   */
  def fromGribFile(
    gribFile: os.Path,
    forecastInitDateTime: OffsetDateTime,
    forecastHourOffset: Int,
    subgrid: Subgrid
  ): IndexedSeq[IndexedSeq[Forecast]] = {
    Grib.bracket(gribFile) { grib =>
      val forecastTime = forecastInitDateTime.plusHours(forecastHourOffset)
      val forecasts = GfsGrib.readSubgrid(grib, subgrid, forecastTime)
      logger.debug(s"Read $gribFile")
      forecasts
    }
  }

  val gribFilterParameters = List(
    "lev_mean_sea_level",
    "lev_0C_isotherm",
    "lev_10_m_above_ground",
    "lev_200_mb",
    "lev_2_m_above_ground",
    "lev_300_mb",
    "lev_400_mb",
    "lev_450_mb",
    "lev_500_mb",
    "lev_550_mb",
    "lev_600_mb",
    "lev_650_mb",
    "lev_700_mb",
    "lev_750_mb",
    "lev_800_mb",
    "lev_850_mb",
    "lev_900_mb",
    "lev_925_mb",
    "lev_950_mb",
    "lev_975_mb",
    "lev_1000_mb",
    "lev_convective_cloud_layer",
    "lev_entire_atmosphere",
    "lev_planetary_boundary_layer",
    "lev_surface",
    "var_PRATE",
    "var_CPRAT",
    "var_CAPE",
    "var_CIN",
    "var_DSWRF",
    "var_HGT",
    "var_HPBL",
    "var_LHTFL",
    "var_MSLET",
    "var_RH",
    "var_SHTFL",
    "var_TCDC",
    "var_TMP",
    "var_UGRD",
    "var_VGRD",
    "var_WEASD"
  )

  private def readSubgrid(grib: Grib, subgrid: Subgrid, time: OffsetDateTime): IndexedSeq[IndexedSeq[Forecast]] = {
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
    // See also https://github.com/Boran/soaringmeteo/blob/46ba843c2fe22b69c66db30a97679a3d1fb34f35/src/makeGFSJs.pas#L912
    val tcdcConv = Feature("Total_cloud_cover_convective_cloud")

    val dswrfSurface =
      Feature
        .maybe("Downward_Short-Wave_Radiation_Flux_surface_3_Hour_Average")
        .getOrElse(Feature("Downward_Short-Wave_Radiation_Flux_surface_6_Hour_Average"))

    val hgt0 = Feature("Geopotential_height_zeroDegC_isotherm")

    val prateSurface = Feature("Precipitation_rate_surface")
    val cpratSurface = Feature("Convective_precipitation_rate_surface")

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

    val isobaricFeatures = IsobaricVariables.pressureLevels
      .map { pressureLevel =>
        val hgt = Feature("Geopotential_height_isobaric")
        val tmp = Feature("Temperature_isobaric")
        val rh = Feature("Relative_humidity_isobaric")
        val ugrd = Feature("u-component_of_wind_isobaric")
        val vgrd = Feature("v-component_of_wind_isobaric")
        val cc = Feature("Total_cloud_cover_isobaric")
        pressureLevel -> ((hgt, tmp, rh, ugrd, vgrd, cc))
      }
      .to(Map)

    val msletMean = Feature("MSLP_Eta_model_reduction_msl")
    val weasdSurface = Feature("Water_equivalent_of_accumulated_snow_depth_surface")

    val tmp2 = Feature("Temperature_height_above_ground")
    val rh2 = Feature("Relative_humidity_height_above_ground")

    val ugrd10 = Feature("u-component_of_wind_height_above_ground")
    val vgrd10 = Feature("v-component_of_wind_height_above_ground")

    for (longitude <- subgrid.longitudes) yield {
      for (latitude <- subgrid.latitudes) yield {
        val location = Point(latitude, longitude)

        // Read the value of the given `grid` at the current `location`
        def readXY(feature: Feature): Double = feature.read(location)

        val isobaricVariables = isobaricFeatures.map { case (pressure, (hgt, tmp, rh, ugrd, vgrd, cc)) =>
          // Read the value of the given `grid` at the current `location` and `pressure` level
          def readXYZ(feature: Feature) = feature.read(location, pressure.toPascals)

          pressure -> IsobaricVariables(
            Meters(readXYZ(hgt)),
            Kelvin(readXYZ(tmp)),
            readXYZ(rh),
            Wind(
              MetersPerSecond(readXYZ(ugrd)),
              MetersPerSecond(readXYZ(vgrd))
            ),
            readXYZ(cc).round.intValue()
          )
        }

        makeForecast(
          time = time,
          elevation = Meters(readXY(hgtSurface)),
          boundaryLayerDepth = Meters(readXY(hpblSurface)),
          boundaryLayerWind = Wind(
            MetersPerSecond(readXY(ugrdPlanetary)),
            MetersPerSecond(readXY(vgrdPlanetary))
          ),
          totalCloudCover = readXY(tcdcEntire).round.intValue(),
          convectiveCloudCover = readXY(tcdcConv).round.intValue(),
          atPressure = isobaricVariables,
          mslet = Pascals(readXY(msletMean)),
          snowDepth = Millimeters(readXY(weasdSurface)), // kg/m² <=> mm (for water)
          surfaceTemperature = Kelvin(readXY(tmp2)),
          surfaceRelativeHumidity = readXY(rh2),
          surfaceWind = Wind(
            MetersPerSecond(readXY(ugrd10)),
            MetersPerSecond(readXY(vgrd10))
          ),
          accumulatedRain = Millimeters(readXY(prateSurface) * 3 * 60 * 60), // FIXME The values seem a bit too high
          accumulatedConvectiveRain = Millimeters(readXY(cpratSurface) * 3 * 60 * 60),
          latentHeatNetFlux = WattsPerSquareMeter(readXY(lhtflSurface)),
          sensibleHeatNetFlux = WattsPerSquareMeter(readXY(shtflSurface)),
          cape = Grays(readXY(capeSurface)),
          cin = Grays(readXY(cinSurface)),
          downwardShortWaveRadiationFlux = WattsPerSquareMeter(readXY(dswrfSurface)),
          isothermZero = Meters(readXY(hgt0))
        )
      }
    }
  }

  /**
   * Compute a couple of extra information from the raw data we get from the
   * GFS model such as the thermal velocity, the soaring layer depth, the XC
   * flying potential, the wind at relevant elevation levels, etc.
   */
  private def makeForecast(
    time: OffsetDateTime,
    elevation: Length,
    boundaryLayerDepth: Length, // m AGL
    boundaryLayerWind: Wind,
    totalCloudCover: Int, // Between 0 and 100
    convectiveCloudCover: Int, // Between 0 and 100
    atPressure: Map[Pressure, IsobaricVariables],
    mslet: Pressure,
    snowDepth: Length,
    surfaceTemperature: Temperature, // Air temperature at 2 meters above the ground level
    surfaceRelativeHumidity: Double,
    surfaceWind: Wind,
    accumulatedRain: Length,
    accumulatedConvectiveRain: Length,
    latentHeatNetFlux: Irradiance,
    sensibleHeatNetFlux: Irradiance,
    cape: SpecificEnergy,
    cin: SpecificEnergy,
    downwardShortWaveRadiationFlux: Irradiance,
    isothermZero: Length
  ): Forecast = {
    val surfaceDewPoint = dewPoint(surfaceTemperature, surfaceRelativeHumidity)
    val thermalVelocity = Thermals.velocity(sensibleHeatNetFlux, boundaryLayerDepth)
    val airData =
      atPressure.values
        .view
        .filter(_.geopotentialHeight >= elevation)
        .map { variables =>
          val height = variables.geopotentialHeight
          val aboveGround =
            org.soaringmeteo.AirData(
              variables.wind,
              variables.temperature,
              variables.dewPoint,
              variables.cloudCover
            )
          height -> aboveGround
        }.to(SortedMap)
    val maybeConvectiveClouds = ConvectiveClouds(surfaceTemperature, surfaceDewPoint, elevation, boundaryLayerDepth, airData)
    val soaringLayerDepth: Length = Thermals.soaringLayerDepth(elevation, boundaryLayerDepth, maybeConvectiveClouds)
    val xcFlyingPotential = XCFlyingPotential(
      thermalVelocity,
      soaringLayerDepth,
      boundaryLayerWind.speed,
      surfaceWind.speed
    )

    org.soaringmeteo.Forecast(
      time,
      elevation,
      boundaryLayerDepth,
      boundaryLayerWind,
      thermalVelocity,
      totalCloudCover,
      convectiveCloudCover,
      maybeConvectiveClouds,
      airData,
      mslet,
      snowDepth,
      surfaceTemperature,
      surfaceDewPoint,
      surfaceWind,
      accumulatedRain,
      accumulatedConvectiveRain,
      latentHeatNetFlux,
      sensibleHeatNetFlux,
      cape,
      cin,
      downwardShortWaveRadiationFlux,
      Some(isothermZero),
      Winds(airData, elevation, soaringLayerDepth),
      xcFlyingPotential,
      soaringLayerDepth
    )
  }

}
