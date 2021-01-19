package org.soaringmeteo.gfs

import java.time.OffsetDateTime

import io.circe.{Codec, Decoder, Encoder, Json}

/**
 * @param initDateString   Formatted initialization time of the forecast (used as a prefix for generated file names)
 * @param initDateTime     Initialization time of the forecast
 * @param latestHourOffset Offset (in number of hours from the init time) of the latest period of forecast
 * @param maybePreviousForecastInitDateTime Path of the previous forecast
 */
case class ForecastMetadata(
  initDateString: String,
  initDateTime: OffsetDateTime,
  latestHourOffset: Int,
  maybePreviousForecastInitDateTime: Option[OffsetDateTime]
)

object ForecastMetadata {

  def archivedForecastFileName(forecastInitDateTime: OffsetDateTime): String =
    s"${InitDateString(forecastInitDateTime)}-forecast.json"

  val jsonCodec: Codec[ForecastMetadata] =
    Codec.from(
      Decoder.instance { cursor =>
        for {
          initS  <- cursor.downField("initS").as[String]
          init   <- cursor.downField("init").as[OffsetDateTime]
          latest <- cursor.downField("latest").as[Int]
          prev   <- cursor.downField("prev").as[Option[(String, OffsetDateTime)]]
        } yield ForecastMetadata(initS, init, latest, prev.map(_._2))
      },
      Encoder.instance { forecastMetadata =>
        Json.obj(
          "h" -> Json.fromInt(Settings.forecastHistoryDays),
          "initS"  -> Json.fromString(forecastMetadata.initDateString),
          "init"   -> Encoder[OffsetDateTime].apply(forecastMetadata.initDateTime),
          "latest" -> Json.fromInt(forecastMetadata.latestHourOffset)
        ).deepMerge(
          forecastMetadata.maybePreviousForecastInitDateTime match {
            case Some(previousForecastInitDateTime) =>
              Json.obj("prev" ->
                Json.arr(
                  Json.fromString(archivedForecastFileName(previousForecastInitDateTime)),
                  Encoder[OffsetDateTime].apply(previousForecastInitDateTime)
                )
              )
            case None =>
              Json.obj()
          }
        )
      }
    )

}
