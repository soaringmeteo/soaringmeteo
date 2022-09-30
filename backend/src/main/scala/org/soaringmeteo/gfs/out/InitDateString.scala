package org.soaringmeteo.gfs.out

import java.time.{LocalDate, LocalTime, OffsetDateTime, ZoneOffset}
import java.time.format.DateTimeFormatter

object InitDateString {

  // Matches names _starting with_ a date formatted as below
  private val dateTimeStringPrefix = "^(\\d+)-(\\d+)-(\\d+)T(\\d+).*".r

  def apply(dateTime: OffsetDateTime): String =
    dateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH"))

  def parse(str: String): Option[OffsetDateTime] = str match {
    case dateTimeStringPrefix(year, month, day, hour) =>
      Some(
        OffsetDateTime.of(
          LocalDate.of(year.toInt, month.toInt, day.toInt),
          LocalTime.of(hour.toInt, 0),
          ZoneOffset.UTC
        )
      )
    case _ => None
  }

}
