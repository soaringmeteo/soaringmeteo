package org.soaringmeteo

import java.time.OffsetDateTime

import io.circe.{Codec, Decoder, Encoder, Json}

/**
 * @param initDateTime     Initialization time of the forecast
 * @param latestHourOffset Offset (in number of hours from the init time) of the latest period of forecast
 */
case class ForecastMetadata(initDateTime: OffsetDateTime, latestHourOffset: Int)

object ForecastMetadata {

  val jsonCodec: Codec[ForecastMetadata] =
    Codec.from(
      Decoder.instance { cursor =>
        for {
          init   <- cursor.downField("init").as[OffsetDateTime]
          latest <- cursor.downField("latest").as[Int]
        } yield ForecastMetadata(init, latest)
      },
      Encoder.instance { forecastMetadata =>
        Json.obj(
          "init" -> Encoder[OffsetDateTime].apply(forecastMetadata.initDateTime),
          "latest" -> Json.fromInt(forecastMetadata.latestHourOffset)
        )
      }
    )

}
