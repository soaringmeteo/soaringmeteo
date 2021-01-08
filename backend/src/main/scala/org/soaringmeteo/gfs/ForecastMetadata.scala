package org.soaringmeteo.gfs

import java.time.OffsetDateTime

import io.circe.{Codec, Decoder, Encoder, Json}

/**
 * @param initDateString   Formatted initialization time of the forecast (used as a prefix for generated file names)
 * @param initDateTime     Initialization time of the forecast
 * @param latestHourOffset Offset (in number of hours from the init time) of the latest period of forecast
 */
case class ForecastMetadata(initDateString: String, initDateTime: OffsetDateTime, latestHourOffset: Int)

object ForecastMetadata {

  val jsonCodec: Codec[ForecastMetadata] =
    Codec.from(
      Decoder.instance { cursor =>
        for {
          initS  <- cursor.downField("initS").as[String]
          init   <- cursor.downField("init").as[OffsetDateTime]
          latest <- cursor.downField("latest").as[Int]
        } yield ForecastMetadata(initS, init, latest)
      },
      Encoder.instance { forecastMetadata =>
        Json.obj(
          "initS"  -> Json.fromString(forecastMetadata.initDateString),
          "init"   -> Encoder[OffsetDateTime].apply(forecastMetadata.initDateTime),
          "latest" -> Json.fromInt(forecastMetadata.latestHourOffset)
        )
      }
    )

}
