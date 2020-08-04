package org.soaringmeteo

import java.time.OffsetDateTime

import io.circe.{Codec, Decoder, Encoder, Json}

object ForecastInitDateTime {

  val jsonCodec: Codec[OffsetDateTime] =
    Codec.from(
      Decoder.instance { cursor =>
        cursor.downField("init").as[OffsetDateTime]
      },
      Encoder.instance { forecastInitDateTime =>
        Json.obj(
          "init" -> Encoder[OffsetDateTime].apply(forecastInitDateTime)
        )
      }
    )

}
