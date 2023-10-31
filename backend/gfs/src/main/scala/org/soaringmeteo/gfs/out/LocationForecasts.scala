package org.soaringmeteo.gfs.out

import java.time.format.DateTimeFormatter
import java.time.{LocalDate, OffsetDateTime}
import io.circe.{Encoder, Json}
import org.soaringmeteo.gfs.Settings
import org.soaringmeteo.{AirData, ConvectiveClouds, Forecast, Point, Wind, Winds}
import squants.Velocity
import squants.energy.SpecificEnergy
import squants.motion.Pressure
import squants.radio.Irradiance
import squants.space.{Length, Meters}
import squants.thermal.Temperature

import java.math.MathContext
import scala.collection.SortedMap
import scala.util.chaining._

/**
 * All the forecast data for one location and several days, with
 * high-level information extracted from the content of each GFS forecast
 * (e.g., thunderstorm risk per day).
 * This forecast data is used to build meteograms.
 */
case class LocationForecasts(
  elevation: Length,
  dayForecasts: Seq[DayForecast]
)

case class DayForecast(
  date: LocalDate,
  hourForecasts: Seq[DetailedForecast],
  thunderstormRisk: Int /* Between 0 and 4, for the entire day (not just the forecast period. */
)

case class DetailedForecast(
  time: OffsetDateTime,
  xcFlyingPotential: Int, // Between 0 and 100
  boundaryLayerDepth: Length, // m (AGL)
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
  winds: Winds
)

object LocationForecasts {

  def apply(forecasts: Seq[Forecast]): LocationForecasts = {
    val detailedForecasts: Seq[DetailedForecast] =
      forecasts.map { forecast =>
          DetailedForecast(
            forecast.time,
            forecast.xcFlyingPotential,
            forecast.boundaryLayerDepth,
            forecast.boundaryLayerWind,
            forecast.thermalVelocity,
            forecast.totalCloudCover,
            forecast.convectiveCloudCover,
            forecast.convectiveClouds,
            forecast.airDataByAltitude,
            forecast.mslet,
            forecast.snowDepth,
            forecast.surfaceTemperature,
            forecast.surfaceDewPoint,
            forecast.surfaceWind,
            forecast.totalRain,
            forecast.convectiveRain,
            forecast.latentHeatNetFlux,
            forecast.sensibleHeatNetFlux,
            forecast.cape,
            forecast.cin,
            forecast.downwardShortWaveRadiationFlux,
            forecast.isothermZero,
            forecast.winds
          )
      }
    LocationForecasts(
      elevation = forecasts.head.elevation,
      dayForecasts =
        detailedForecasts
          .groupBy(_.time.toLocalDate)
          .filter { case (_, forecasts) => forecasts.nonEmpty }
          .toSeq
          .sortBy(_._1)
          .map { case (forecastDate, hourForecasts) =>
            DayForecast(
              forecastDate,
              hourForecasts.sortBy(_.time),
              if (hourForecasts.sizeIs == 3) thunderstormRisk(hourForecasts(0), hourForecasts(1), hourForecasts(2))
              else {
                // TODO Print warning?
                0
              }

            )
          }
    )
  }

  def isRelevant(location: Point): OffsetDateTime => Boolean = {
    // Transform longitude so that it goes from 0 to 360 instead of 180 to -180
    val normalizedLongitude = 180 - location.longitude
    // Width of each zone, in degrees
    val zoneWidthDegrees = 360 / Settings.numberOfForecastsPerDay
    // Width of each zone, in hours
    val zoneWidthHours   = Settings.gfsForecastTimeResolution
    // Noon time offset is 12 around prime meridian, 0 on the other side of the
    // earth, and 6 on the east and 21 on the west.
    // For example, a point with a longitude of 7 (e.g., Bulle) will have a normalized
    // longitude of 173. If we divide this number of degrees by the width of a zone,
    // we get its zone number, 4. Finally, we multiply this zone number by the number of
    // hours of a zone, we get the noon time for this longitude, 12.
    val noonHour =
      ((normalizedLongitude + (zoneWidthDegrees / 2.0)) % 360).doubleValue.round.toInt / zoneWidthDegrees * zoneWidthHours

    val allHours = (0 until 24 by Settings.gfsForecastTimeResolution).to(Set)

    val relevantHours: Set[Int] =
      (1 to Settings.relevantForecastPeriodsPerDay).foldLeft((allHours, Set.empty[Int])) {
        case ((hs, rhs), _) =>
          val rh = hs.minBy(h => math.min(noonHour + 24 - h, math.abs(h - noonHour)))
          (hs - rh, rhs + rh)
      }._2

    time => {
      relevantHours.contains(time.getHour)
    }
  }

  // FIXME Generalize to an arbitrary number of forecasts for the day
  def thunderstormRisk(
    forecastMorning: DetailedForecast,
    forecastNoon: DetailedForecast,
    forecastAfternoon: DetailedForecast
  ): Int = {
    // Blindly copied from src/makeGFSJs.pas. We seriously need to check the formulas again.
    val baseCAPE = (forecastNoon.cape.toGrays + forecastAfternoon.cape.toGrays) / 100
    val factorCAPE =
      if (baseCAPE >= 2) baseCAPE
      else baseCAPE - 4 * (2 - baseCAPE)

    val spreadAltiMorning   = spreadAlti(forecastMorning)
    val spreadAltiNoon      = spreadAlti(forecastNoon)
    val spreadAltiAfternoon = spreadAlti(forecastAfternoon)
    val factorSpread        = (spreadAltiMorning + spreadAltiNoon + spreadAltiAfternoon) / 3

    val factorSensibleHeat =
      (forecastMorning.sensibleHeatNetFlux.toWattsPerSquareMeter / 10).min(10)
      .pipe { rawValue =>
        if (rawValue >= 3) rawValue
        else rawValue - 3 * (3 - rawValue)
      }

    val factorConvection = (
      (
        forecastMorning.convectiveCloudCover +
        forecastNoon.convectiveCloudCover +
        forecastAfternoon.convectiveCloudCover
      ) / 10.0 +
      forecastMorning.convectiveRain.toMillimeters +
      forecastNoon.convectiveRain.toMillimeters +
      forecastAfternoon.convectiveRain.toMillimeters
    ) / 2

    val factorG = factorCAPE + factorConvection + factorSensibleHeat - factorSpread

    if (factorG < -3) 0
    else if (factorG < 3) 1
    else if (factorG < 8) 2
    else if (factorG < 18) 3
    else 4
  }

  /** Average “spread” value for altitudes above 3000 m */
  def spreadAlti(forecast: DetailedForecast): Double = {
    forecast.airDataByAltitude
      .view
      .filterKeys(_ >= Meters(3000))
      .map { case (_, aboveGround) => aboveGround.temperature.toCelsiusScale - aboveGround.dewPoint.toCelsiusScale }
      .pipe(spreads => spreads.sum / spreads.size)
  }

  val jsonEncoder: Encoder[LocationForecasts] =
    Encoder.instance { locationForecasts =>
      Json.obj(
        "h" -> Json.fromInt(locationForecasts.elevation.toMeters.round.toInt),
        "d" -> Json.arr(
          locationForecasts.dayForecasts.map { dayForecast =>
            Json.obj(
              "th" -> Json.fromInt(dayForecast.thunderstormRisk),
              "h" -> Json.arr(
                dayForecast.hourForecasts.map { forecast =>
                  Json.obj(
                    "t" -> Json.fromString(forecast.time.format(DateTimeFormatter.ISO_DATE_TIME)),
                    "xc" -> Json.fromInt(forecast.xcFlyingPotential),
                    "bl" -> Json.obj(Seq(
                      "h" -> Json.fromInt(forecast.boundaryLayerDepth.toMeters.round.toInt),
                      "u" -> Json.fromInt(forecast.boundaryLayerWind.u.toKilometersPerHour.round.toInt),
                      "v" -> Json.fromInt(forecast.boundaryLayerWind.v.toKilometersPerHour.round.toInt)
                    ) ++ (
                      forecast.convectiveClouds match {
                        case None => Nil
                        case Some(convectiveClouds) =>
                          Seq("c" -> Json.arr(
                            Json.fromInt((convectiveClouds.bottom - locationForecasts.elevation).toMeters.round.toInt),
                            Json.fromInt((convectiveClouds.top - locationForecasts.elevation).toMeters.round.toInt)
                          ))
                      }
                    ): _*),
                    "v" -> Json.fromInt((forecast.thermalVelocity.toMetersPerSecond * 10).round.toInt), // dm/s (to avoid floating point values)
                    "p" -> Json.arr(forecast.airDataByAltitude.map { case (elevation, aboveGround) =>
                      Json.obj(
                        "h" -> Json.fromInt(elevation.toMeters.round.toInt),
                        "t" -> encodeRealNumber(aboveGround.temperature.toCelsiusScale, 3),
                        "dt" -> encodeRealNumber(aboveGround.dewPoint.toCelsiusScale, 3),
                        "u" -> Json.fromInt(aboveGround.wind.u.toKilometersPerHour.round.toInt),
                        "v" -> Json.fromInt(aboveGround.wind.v.toKilometersPerHour.round.toInt),
                        "c" -> Json.fromInt(aboveGround.cloudCover)
                      )
                    }.toSeq: _*),
                    "s" -> Json.obj(
                      "t" -> encodeRealNumber(forecast.surfaceTemperature.toCelsiusScale, 3),
                      "dt" -> encodeRealNumber(forecast.surfaceDewPoint.toCelsiusScale, 3),
                      "u" -> Json.fromInt(forecast.surfaceWind.u.toKilometersPerHour.round.toInt),
                      "v" -> Json.fromInt(forecast.surfaceWind.v.toKilometersPerHour.round.toInt)
                    ),
                    "iso" -> Json.fromInt(forecast.isothermZero.toMeters.round.toInt),
                    "r" -> Json.obj(
                      "t" -> Json.fromInt(forecast.totalRain.toMillimeters.round.toInt),
                      "c" -> Json.fromInt(forecast.convectiveRain.toMillimeters.round.toInt)
                    ),
                    "mslet" -> Json.fromInt(forecast.mslet.toPascals.round.toInt / 100), // hPa
                    "c" -> Json.fromInt(forecast.totalCloudCover),
                    "w" -> Json.arr(
                      Seq(
                        forecast.winds.soaringLayerTop,
                        forecast.winds.`300m AGL`,
                        forecast.winds.`2000m AMSL`,
                        forecast.winds.`3000m AMSL`,
                        forecast.winds.`4000m AMSL`
                      ).map(wind => Json.obj(
                        "u" -> Json.fromInt(wind.u.toKilometersPerHour.round.toInt),
                        "v" -> Json.fromInt(wind.v.toKilometersPerHour.round.toInt)
                      )): _*
                    )
                    // TODO Irradiance, CIN, snow
                  )
                }: _*
              )
            )
          }: _*
        )
      )
    }

  def encodeRealNumber(number: Double, precision: Int): Json =
    if (java.lang.Double.isFinite(number)) Json.fromBigDecimal(BigDecimal(number).round(new MathContext(precision)))
    else Json.Null

}
