package org.soaringmeteo

import io.circe.{Encoder, Json}

case class GfsForecast(
  boundaryLayerHeight: Int,
  wind: Wind,
  cloudCover: Option[Double] // Optional because the first forecast (t = 00) doesn't have it. FIXME Find a better way to get the cloud cover?
  // TODO More data like air temperature, etc.
)

object GfsForecast {

  /**
   * @param gribsDir     Directory containing the downloaded GRIB files
   * @param forecastTime Time of forecast we want to extract, in number of hours
   *                     from the forecast initialization (e.g., 0, 3, 6, etc.)
   * @param locations    Set of points for which we want to extract the forecast data. FIXME Extract data for all points
   * @return
   */
  def fromGribFile(gribsDir: os.Path, forecastTime: Int, locations: Seq[GfsLocation]): Map[Point, GfsForecast] = {
    val gribFile = gribsDir / forecastTime.toString()
    Grib.bracket(gribFile) { grib =>
      grib.forecast(locations)
    }
  }

  /**
   * JSON representation of the forecast data.
   * WARNING: client must be consistent with this serialization format.
   */
  implicit val jsonEncoder: Encoder[GfsForecast] =
    Encoder.instance { forecast =>
      Json.obj(
        "blh" -> Json.fromInt(forecast.boundaryLayerHeight),
        "u" -> Json.fromInt(forecast.wind.u.round.toInt),
        "v" -> Json.fromInt(forecast.wind.v.round.toInt),
        "c" -> forecast.cloudCover.fold(Json.Null)(Json.fromBigDecimal(_))
      )
    }

}
