package org.soaringmeteo

import squants.energy.SpecificEnergy
import squants.motion.{Pressure, Velocity}
import squants.radio.Irradiance
import squants.space.Length
import squants.thermal.Temperature

import java.time.OffsetDateTime
import scala.collection.SortedMap

/**
 * Result of processing the forecast data read from the input sources (GRIB files or .nc files).
 *
 * In the case of the GFS pipeline, this data is saved on the disk storage.
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
  snowDepth: Length, // FIXME Remove
  surfaceTemperature: Temperature,
  surfaceDewPoint: Temperature,
  surfaceWind: Wind,
  totalRain: Length,
  convectiveRain: Length,
  latentHeatNetFlux: Irradiance, // FIXME Remove
  sensibleHeatNetFlux: Irradiance, // FIXME Remove
  cape: SpecificEnergy, // FIXME Remove
  cin: SpecificEnergy, // FIXME Remove
  downwardShortWaveRadiationFlux: Irradiance, // FIXME Remove
  isothermZero: Option[Length],
  winds: Winds, // wind value at some specific elevation levels
  xcFlyingPotential: Int,
  soaringLayerDepth: Length // m (AGL)
)

/**
 * Various information at some elevation level. Used for the sounding diagrams and meteograms.
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
