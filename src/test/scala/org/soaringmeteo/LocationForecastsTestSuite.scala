package org.soaringmeteo

import java.time.{LocalDate, LocalTime, OffsetDateTime, ZoneOffset}
import java.time.OffsetDateTime.parse

import org.soaringmeteo.LocationForecasts.isRelevant
import verify.BasicTestSuite

object LocationForecastsTestSuite extends BasicTestSuite {

  test("LocationForecasts.isRelevant") {
    val forecastTimes = (0 to 21 by 3).map { hour =>
      OffsetDateTime.of(
        LocalDate.of(2020, 8, 1),
        LocalTime.of(hour, 0, 0),
        ZoneOffset.UTC
      )
    }

    for {
      longitude <- BigDecimal(-180) until BigDecimal(180) by 0.5
    } {
      val relevantForecasts = forecastTimes.count(isRelevant(Point(latitude = 0, longitude)))
      assert(relevantForecasts == Settings.relevantForecastPeriodsPerDay)
    }

    locally {
      val isRelevantAtPoint = isRelevant(Point(0, -180))
      assert(isRelevantAtPoint(parse("2020-08-01T00:00:00Z")))
      assert(isRelevantAtPoint(parse("2020-08-01T03:00:00Z")))
      assert(!isRelevantAtPoint(parse("2020-08-01T06:00:00Z")))
      assert(!isRelevantAtPoint(parse("2020-08-01T09:00:00Z")))
      assert(!isRelevantAtPoint(parse("2020-08-01T12:00:00Z")))
      assert(!isRelevantAtPoint(parse("2020-08-01T15:00:00Z")))
      assert(!isRelevantAtPoint(parse("2020-08-01T18:00:00Z")))
      assert(isRelevantAtPoint(parse("2020-08-01T21:00:00Z")))
    }

    locally {
      val isRelevantAtPoint = isRelevant(Point(0, 7))
      assert(!isRelevantAtPoint(parse("2020-08-01T00:00:00Z")))
      assert(!isRelevantAtPoint(parse("2020-08-01T03:00:00Z")))
      assert(!isRelevantAtPoint(parse("2020-08-01T06:00:00Z")))
      assert(isRelevantAtPoint(parse("2020-08-01T09:00:00Z")))
      assert(isRelevantAtPoint(parse("2020-08-01T12:00:00Z")))
      assert(isRelevantAtPoint(parse("2020-08-01T15:00:00Z")))
      assert(!isRelevantAtPoint(parse("2020-08-01T18:00:00Z")))
      assert(!isRelevantAtPoint(parse("2020-08-01T21:00:00Z")))
    }

  }

}
