package org.soaringmeteo

import java.time.{LocalDate, LocalTime, OffsetDateTime, ZoneOffset}
import java.time.format.DateTimeFormatter

object InitDateString {

  // Matches names _starting with_ a date formatted as below
  private val dateTimeStringPrefix = "^(\\d+)-(\\d+)-(\\d+)T(\\d+).*".r

  def apply(dateTime: OffsetDateTime): String =
    dateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH"))

}
