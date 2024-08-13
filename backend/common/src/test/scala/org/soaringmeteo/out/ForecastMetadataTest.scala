package org.soaringmeteo.out

import verify.BasicTestSuite

import java.time.{OffsetDateTime, Period}

object ForecastMetadataTest extends BasicTestSuite {

  test("updateForecasts with no previous forecasts") {
    val forecast = ForecastMetadata("foo", OffsetDateTime.now(), None, 42, Nil)
    val forecasts = ForecastMetadata.updateForecasts(forecast, Nil, Period.ofDays(1))
    assert(forecasts == Seq(forecast))
  }

  test("updateForecast with older previous forecasts") {
    val forecast = ForecastMetadata("foo", OffsetDateTime.now(), None, 42, Nil)
    val previousForecasts = Seq(
      ForecastMetadata("bar", forecast.initDateTime.minusHours(12), None, 42, Nil)
    )
    val forecasts = ForecastMetadata.updateForecasts(forecast, previousForecasts, Period.ofDays(1))
    assert(forecasts == (previousForecasts ++ Seq(forecast)))
  }

  test("updateForecast with previous forecasts going further in the future than the latest forecast") {
    val forecast = ForecastMetadata("foo", OffsetDateTime.now(), None, 42, Nil)
    val previousForecasts = Seq(
      ForecastMetadata("bar", forecast.initDateTime.minusHours(12), Some(OffsetDateTime.now().plusDays(1)), 42, Nil)
    )
    val forecasts = ForecastMetadata.updateForecasts(forecast, previousForecasts, Period.ofDays(1))
    assert(forecasts == (Seq(forecast) ++ previousForecasts))
  }

  test("updateForecast with expired previous forecasts") {
    val forecast = ForecastMetadata("foo", OffsetDateTime.now(), None, 42, Nil)
    val previousForecasts = Seq(
      ForecastMetadata("bar", forecast.initDateTime.minusDays(2), None, 42, Nil)
    )
    val forecasts = ForecastMetadata.updateForecasts(forecast, previousForecasts, Period.ofDays(1))
    assert(forecasts == Seq(forecast))
  }

  test("updateForecast with previous forecast having the same start time as the latest forecast") {
    val forecast = ForecastMetadata("foo", OffsetDateTime.now(), None, 42, Nil)
    val previousForecasts = Seq(
      ForecastMetadata("bar", forecast.initDateTime.minusDays(1), Some(forecast.firstDateTime), 42, Nil)
    )
    val forecasts = ForecastMetadata.updateForecasts(forecast, previousForecasts, Period.ofDays(2))
    assert(forecasts == Seq(forecast))
  }

}
