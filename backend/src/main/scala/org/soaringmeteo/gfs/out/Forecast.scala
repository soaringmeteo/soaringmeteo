package org.soaringmeteo.gfs.out

import org.slf4j.LoggerFactory
import org.soaringmeteo.Temperatures.dewPoint
import org.soaringmeteo.gfs.in.GfsGrib
import org.soaringmeteo.gfs.{Subgrid, in}
import org.soaringmeteo.grib.Grib
import org.soaringmeteo.{Wind, XCFlyingPotential}
import squants.energy.SpecificEnergy
import squants.motion.{Pressure, Velocity}
import squants.radio.Irradiance
import squants.space.Length
import squants.thermal.Temperature

import java.time.OffsetDateTime
import scala.collection.immutable.SortedMap

/**
 * Result of processing the forecast data read from the GRIB files.
 *
 * This data is saved on the disk storage.
 */
case class Forecast(
  time: OffsetDateTime,
  elevation: Length,
  boundaryLayerDepth: Length, // m AGL
  boundaryLayerWind: Wind,
  thermalVelocity: Velocity,
  totalCloudCover: Int, // Between 0 and 100
  convectiveCloudCover: Int, // Between 0 and 100
  convectiveClouds: Option[ConvectiveClouds],
  airDataByAltitude: SortedMap[Length, AirData],
  mslet: Pressure,
  snowDepth: Length,
  surfaceTemperature: Temperature,
  surfaceDewPoint: Temperature,
  surfaceWind: Wind,
  totalRain: Length,
  convectiveRain: Length,
  latentHeatNetFlux: Irradiance,
  sensibleHeatNetFlux: Irradiance,
  cape: SpecificEnergy,
  cin: SpecificEnergy,
  downwardShortWaveRadiationFlux: Irradiance,
  isothermZero: Length,
  winds: Winds, // wind value at some specific elevation levels
  xcFlyingPotential: Int,
  soaringLayerDepth: Length // m (AGL)
)

/**
 * Various information at some elevation level
 * @param wind        Wind force and direction at the `elevation` level
 * @param temperature Air temperature at the `elevation` level
 * @param dewPoint    Air humidity at the `elevation` level
 */
case class AirData(
  wind: Wind,
  temperature: Temperature,
  dewPoint: Temperature,
  cloudCover: Int
)

object AirData {
  def apply(atPressure: Map[Pressure, in.IsobaricVariables], groundLevel: Length): SortedMap[Length, AirData] =
    atPressure.values
      .view
      .filter(_.geopotentialHeight >= groundLevel)
      .map { variables =>
        val height = variables.geopotentialHeight
        val aboveGround =
          AirData(
            variables.wind,
            variables.temperature,
            variables.dewPoint,
            variables.cloudCover
          )
        height -> aboveGround
      }.to(SortedMap)
}

object Forecast {

  private val logger = LoggerFactory.getLogger(classOf[Forecast])

  /**
   * Compute a couple of extra information from the raw data we get from the
   * GFS model such as the thermal velocity, the soaring layer depth, the XC
   * flying potential, the wind at relevant elevation levels, etc.
   */
  def apply(
    time: OffsetDateTime,
    elevation: Length,
    boundaryLayerDepth: Length, // m AGL
    boundaryLayerWind: Wind,
    totalCloudCover: Int, // Between 0 and 100
    convectiveCloudCover: Int, // Between 0 and 100
    atPressure: Map[Pressure, in.IsobaricVariables],
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
    val maybeConvectiveClouds = ConvectiveClouds(surfaceTemperature, surfaceDewPoint, elevation, boundaryLayerDepth, atPressure)
    val soaringLayerDepth: Length =
      maybeConvectiveClouds match {
        case None => boundaryLayerDepth
        // In case of presence of convective clouds, use the cloud base as an upper limit
        // within the boundary layer
        case Some(ConvectiveClouds(bottom, _)) => boundaryLayerDepth.min(bottom - elevation)
      }
    val airData = AirData(atPressure, elevation)

    Forecast(
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
      isothermZero,
      Winds(airData, elevation, soaringLayerDepth),
      XCFlyingPotential(thermalVelocity, soaringLayerDepth, boundaryLayerWind),
      soaringLayerDepth
    )
  }

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

}
