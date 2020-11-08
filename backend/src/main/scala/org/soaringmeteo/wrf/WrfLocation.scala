package org.soaringmeteo.wrf

import kantan.csv.{CsvSource, RowDecoder, rfc}
import org.slf4j.LoggerFactory
import squants.Meters
import squants.space.Length

import scala.collection.immutable.ArraySeq

case class WrfLocation(
  domain: String,
  id: String,
  x: Int,
  y: Int,
  longitude: BigDecimal,
  latitude: BigDecimal,
  elevation: Length,
  priority: WrfLocation.Priority,
  name: String
)

object WrfLocation {

  sealed trait Priority
  case object Primary extends Priority
  case object Secondary extends Priority

  private val logger = LoggerFactory.getLogger(getClass)

  def parse(csvContent: String): IndexedSeq[WrfLocation] =
    CsvSource[String]
      .read[ArraySeq, WrfLocation](csvContent, rfc)
      .collect(Function.unlift {
        case Left(error) =>
          logger.error("Unable to parse WRF location in CSV file.", error)
          None // Just skip the lines that errored and continue with the others
        case Right(wrfLocation) => Some(wrfLocation)
      })

  implicit val wrfLocationDecoder: RowDecoder[WrfLocation] =
    RowDecoder.ordered { (domain: String, id: String, x: Int, y: Int, longitude: BigDecimal, latitude: BigDecimal, elevation: Int, priority: String, name: String) =>
      WrfLocation(
        domain,
        id,
        x,
        y,
        longitude,
        latitude,
        Meters(elevation),
        if (priority == "m") Primary else Secondary,
        name
      )
    }

}
