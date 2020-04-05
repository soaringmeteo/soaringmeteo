package org.soaringmeteo

import kantan.csv.{CsvSource, RowDecoder, rfc}
import org.slf4j.LoggerFactory
import squants.radio.{Irradiance, WattsPerSquareMeter}
import squants.space.{Length, Meters}

import scala.collection.immutable.ArraySeq

/**
 * @param name                  e.g. "Gruyère-Riviera"
 * @param longitude             e.g. 7.0
 * @param latitude              e.g. 46.5
 * @param altitude              e.g. 1016
 * @param timeZoneOffset        Number of hours to add to GMT, e.g. 1
 * @param dstTimeZoneOffset     Same, but during daylight saving time period, e.g. 2
 * @param maxRadWinterMorning   Maximum solar irradiance at the winter solstice, for the morning period
 * @param maxRadWinterNoon      Same, but for the noon period
 * @param maxRadWinterAfternoon Same, but for the afternoon period
 * @param maxRadSummerMorning   Same, but for the summer solstice and morning period
 * @param maxRadSummerNoon      Same, but for the noon period
 * @param maxRadSummerAfternoon Same, but for the afternoon period
 */
case class GfsLocation(
  name: String,
  longitude: BigDecimal,
  latitude: BigDecimal,
  altitude: Length,
  timeZoneOffset: Double, // FIXME Sometimes contains half hours
  dstTimeZoneOffset: Double,
  maxRadWinterMorning: Irradiance,
  maxRadWinterNoon: Irradiance,
  maxRadWinterAfternoon: Irradiance,
  maxRadSummerMorning: Irradiance,
  maxRadSummerNoon: Irradiance,
  maxRadSummerAfternoon: Irradiance
) {

  /**
   * Time offsets (in number of hours) of forecasts that we are
   * interested in for this location. GFS forecasts have a 3-hours
   * resolution, and we are interested in three forecasts: one around
   * noon, one 3-hours before, and one 3-hours after.
   *
   * @param  initializationTime time (UTC) of initialization of the GFS run (0, 6, 12, or 18).
   * @return The list of forecast time offsets for this GFS location,
   *         in increasing order.
   */
  def forecastTimeOffsets(initializationTime: GfsInitializationTime.Value): Seq[Int] = {
    // Divide the world into 8 zones, according to their longitude
    val numberOfZones = 8
    // Width of each zone, in degrees
    val zoneWidthDegrees = 360 / numberOfZones
    // Width of each zone, in hours
    val zoneWidthHours   = 24 / numberOfZones
    // Transform longitude so that it goes from 0 to 360 instead of 180 to -180
    val normalizedLongitude = 180 - longitude
    // Noon time offset is 12 around prime meridian, 0 on the other side of the
    // earth, and 6 on the east and 21 on the west.
    // For example, a point with a longitude of 7 (e.g., Bulle) will have a normalized
    // longitude of 173. If we divide this number of degrees by the width of a zone,
    // we get its zone number, 4. Finally, we multiply this zone number by the number of
    // hours of a zone, we get the noon time for this longitude, 12.
    val noonTime =
      ((normalizedLongitude + (zoneWidthDegrees / 2.0)) % 360).doubleValue.round.toInt / zoneWidthDegrees * zoneWidthHours
    val dayOffset = if (initializationTime.value == 0) 0 else 24
    val firstNoonTime = dayOffset + noonTime - initializationTime.value
    for {
      day  <- 0 until 7
      timeOffset <- Seq(firstNoonTime - 3, firstNoonTime, firstNoonTime + 3)
    } yield timeOffset + day * 24
  }

}

object GfsLocation {

  private val logger = LoggerFactory.getLogger(getClass)

  /**
   * Parse the GFS locations of the given CSV file.
   * Ignore entries that are invalid.
   */
  def parse(csvContent: String): IndexedSeq[GfsLocation] =
    CsvSource[String]
      .read[ArraySeq, GfsLocation](csvContent, rfc)
      .collect(Function.unlift {
        case Left(error) =>
          logger.error(s"Unable to parse GFS location in CSV file.", error)
          None // Just skip the lines that errored and continue with the others
        case Right(gfsLocation) => Some(gfsLocation)
      })

  // The fields of the GfsLocation case class are in the same order as the columns
  // of the CSV file.
  implicit val gfsLocationRowDecoder: RowDecoder[GfsLocation] =
    RowDecoder.ordered { (name: String, longitude: Int, latitude: Int, altitude: Int, timeZoneOffset: Double, dstTimeZoneOffset: Double, maxRadWinterMorning: Int, maxRadWinterNoon: Int, maxRadWinterAfternoon: Int, maxRadSummerMorning: Int, maxRadSummerNoon: Int, maxRadSummerAfternoon: Int) =>
      GfsLocation(
        name,
        BigDecimal(longitude) / 10,
        BigDecimal(latitude) / 10,
        Meters(altitude),
        timeZoneOffset,
        dstTimeZoneOffset,
        WattsPerSquareMeter(maxRadWinterMorning),
        WattsPerSquareMeter(maxRadWinterNoon),
        WattsPerSquareMeter(maxRadWinterAfternoon),
        WattsPerSquareMeter(maxRadSummerMorning),
        WattsPerSquareMeter(maxRadSummerNoon),
        WattsPerSquareMeter(maxRadSummerAfternoon)
      )
    }

}
