package org.soaringmeteo.gfs.out

import geotrellis.vector.Extent

import java.time.OffsetDateTime
import io.circe.{Codec, Decoder, Encoder, Json}
import org.soaringmeteo.gfs.Settings

/**
 * Description of the forecast data (consumed by the frontend).
 * @param initDateString   Formatted initialization time of the forecast (used as a prefix for generated file names)
 * @param initDateTime     Initialization time of the forecast
 * @param latestHourOffset Offset (in number of hours from the init time) of the latest period of forecast
 * @param maybePreviousForecastInitDateTime Path of the previous forecast
 */
case class ForecastMetadata(
  initDateString: String,
  initDateTime: OffsetDateTime,
  latestHourOffset: Int,
  maybePreviousForecastInitDateTime: Option[OffsetDateTime],
  zones: Seq[ForecastMetadata.Zone]
)

object ForecastMetadata {
  /** Description of the zones covered */
  case class Zone(id: String, label: String, raster: Raster, vectorTiles: VectorTiles)
  /** Description of the raster images of a zone. The coordinates of the extent must be
   *  in the given projection
   */
  case class Raster(projection: String, extent: Extent)
  /** Description of the vector tiles of a zone. The `minZoom` is the minimum zoom level
   *  of the view for showing the vector tiles
   */
  case class VectorTiles(extent: Extent, zoomLevels: Int, minZoom: Int)

  def archivedForecastFileName(forecastInitDateTime: OffsetDateTime): String =
    s"${InitDateString(forecastInitDateTime)}-forecast.json"

  // JSON encoding of the forecast metadata. Must be consistent with the frontend.
  // See `frontend/src/data/ForecastMetadata.ts`
  val jsonCodec: Codec[ForecastMetadata] = {
    val extentCodec: Codec[Extent] =
      Codec.from(
        Decoder.instance { cursor =>
          for {
            xmin <- cursor.downN(0).as[Double]
            ymin <- cursor.downN(1).as[Double]
            xmax <- cursor.downN(2).as[Double]
            ymax <- cursor.downN(3).as[Double]
          } yield Extent(xmin, ymin, xmax, ymax)
        },
        Encoder.instance { extent =>
          Json.arr(
            Json.fromBigDecimal(extent.xmin),
            Json.fromBigDecimal(extent.ymin),
            Json.fromBigDecimal(extent.xmax),
            Json.fromBigDecimal(extent.ymax)
          )
        }
      )
    val rasterCodec: Codec[Raster] =
      Codec.from(
        Decoder.instance { cursor =>
          for {
            projection <- cursor.downField("proj").as[String]
            extent <- cursor.downField("extent").as(extentCodec)
          } yield Raster(projection, extent)
        },
        Encoder.instance { raster =>
          Json.obj(
            "proj" -> Json.fromString(raster.projection),
            "extent" -> extentCodec(raster.extent)
          )
        }
      )
    val vectorTilesCodec: Codec[VectorTiles] =
      Codec.from(
        Decoder.instance { cursor =>
          for {
            extent  <- cursor.downField("extent").as(extentCodec)
            zoomLevels <- cursor.downField("zoomLevels").as[Int]
            minZoom <- cursor.downField("minZoom").as[Int]
          } yield VectorTiles(extent, zoomLevels, minZoom)
        },
        Encoder.instance { tiles =>
          Json.obj(
            "extent" -> extentCodec(tiles.extent),
            "zoomLevels" -> Json.fromInt(tiles.zoomLevels),
            "minZoom" -> Json.fromInt(tiles.minZoom),
          )
        }
      )
    val zoneCodec: Codec[Zone] =
      Codec.from(
        Decoder.instance { cursor =>
          for {
            id <- cursor.downField("id").as[String]
            label <- cursor.downField("label").as[String]
            raster <- cursor.downField("raster").as(rasterCodec)
            vectorTiles <- cursor.downField("vectorTiles").as(vectorTilesCodec)
          } yield Zone(id, label, raster, vectorTiles)
        },
        Encoder.instance { zone =>
          Json.obj(
            "id" -> Json.fromString(zone.id),
            "label" -> Json.fromString(zone.label),
            "raster" -> rasterCodec(zone.raster),
            "vectorTiles" -> vectorTilesCodec(zone.vectorTiles)
          )
        }
      )

    Codec.from(
      Decoder.instance { cursor =>
        for {
          initS  <- cursor.downField("initS").as[String]
          init   <- cursor.downField("init").as[OffsetDateTime]
          latest <- cursor.downField("latest").as[Int]
          prev   <- cursor.downField("prev").as[Option[(String, OffsetDateTime)]]
          zones  <- cursor.downField("zones").as[Seq[Zone]](Decoder.decodeSeq(zoneCodec))
        } yield ForecastMetadata(initS, init, latest, prev.map(_._2), zones)
      },
      Encoder.instance { forecastMetadata =>
        Json.obj(
          "h" -> Json.fromInt(Settings.forecastHistory.getDays),
          "initS"  -> Json.fromString(forecastMetadata.initDateString),
          "init"   -> Encoder[OffsetDateTime].apply(forecastMetadata.initDateTime),
          "latest" -> Json.fromInt(forecastMetadata.latestHourOffset),
          "zones"  -> Encoder.encodeSeq(zoneCodec)(forecastMetadata.zones)
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

}
