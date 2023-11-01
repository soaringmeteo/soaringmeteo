package org.soaringmeteo.out

import geotrellis.vector.Extent
import io.circe

import java.time.OffsetDateTime
import io.circe.{Codec, Decoder, Encoder, Json}
import org.soaringmeteo.InitDateString

import scala.util.Try

/**
 * Description of the forecast data (consumed by the frontend).
 * @param history          How far in the past (in number of days) the previous forecasts have been kept on the server (used by the frontend to load the previous forecast runs)
 * @param initDateString   Formatted initialization time of the forecast (used as a prefix for generated file names)
 * @param initDateTime     Initialization time of the forecast
 * @param latestHourOffset Offset (in number of hours from the init time) of the latest period of forecast
 * @param maybeFirstTimeStep Time of the first time-step (when hourOffset is zero), if different from the initialization time
 * @param maybePreviousForecastInitDateTime Path of the previous forecast
 * @param zones Zones covered by the forecast
 */
case class ForecastMetadata(
  history: Int,
  initDateString: String,
  initDateTime: OffsetDateTime,
  maybeFirstTimeStep: Option[OffsetDateTime],
  latestHourOffset: Int,
  maybePreviousForecastInitDateTime: Option[OffsetDateTime],
  zones: Seq[ForecastMetadata.Zone]
)

object ForecastMetadata {
  /** Description of the zones covered */
  case class Zone(id: String, label: String, raster: Raster, vectorTiles: VectorTiles)
  /** Description of the raster images of a zone.
   * @param projection Identifier of the projection to use to render the raster image
   * @param extent     Extent of the raster (expressed in projection coordinates)
   * @param resolution Size of a pixel in projection unit (e.g. 2000 for WRF, 0.25 for GFS)
   */
  case class Raster(projection: String, resolution: BigDecimal, extent: Extent)
  /** Description of the vector tiles of a zone. The `minZoom` is the minimum zoom level
   *  of the view for showing the vector tiles
   */
  case class VectorTiles(extent: Extent, zoomLevels: Int, minZoom: Int)

  object VectorTiles {
    def apply(parameters: org.soaringmeteo.out.VectorTiles.Parameters): VectorTiles =
      VectorTiles(
        parameters.extent,
        parameters.zoomLevels,
        parameters.minViewZoom
      )
  }

  /**
   * Overwrite the content of the file `forecast.json` to describe to the latest forecast run.
   *
   * @param targetDir      Model target directory (e.g., /data/3/gfs or /data/3/wrf)
   */
  def overwriteLatestForecastMetadata(
    targetDir: os.Path,
    history: Int,
    initDateString: String,
    initDateTime: OffsetDateTime,
    maybeFirstTimeStep: Option[OffsetDateTime],
    latestHourOffset: Int,
    zones: Seq[Zone]
  ): Unit = {
    val latestForecastPath = targetDir / "forecast.json"
    // If a previous forecast is found, rename its metadata file
    val maybePreviousForecastInitDateTime =
      for {
        _ <- Option.when(os.exists(latestForecastPath))(())
        str <- Try(os.read(latestForecastPath)).toOption // FIXME Log more errors
        json <- circe.parser.parse(str).toOption
        metadata <- ForecastMetadata.jsonCodec.decodeJson(json).toOption
        path = ForecastMetadata.archivedForecastFileName(metadata.initDateTime)
        _ <- Try(os.move(latestForecastPath, targetDir / path)).toOption
      } yield metadata.initDateTime

    val metadata =
      ForecastMetadata(
        history,
        initDateString,
        initDateTime,
        maybeFirstTimeStep,
        latestHourOffset,
        maybePreviousForecastInitDateTime,
        zones
      )

    os.write.over(
      latestForecastPath,
      jsonCodec(metadata).noSpaces
    )
  }

  private def archivedForecastFileName(forecastInitDateTime: OffsetDateTime): String =
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
            resolution <- cursor.downField("resolution").as[BigDecimal]
            extent <- cursor.downField("extent").as(extentCodec)
          } yield Raster(projection, resolution, extent)
        },
        Encoder.instance { raster =>
          Json.obj(
            "proj" -> Json.fromString(raster.projection),
            "resolution" -> Json.fromBigDecimal(raster.resolution),
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
          h      <- cursor.downField("h").as[Int]
          initS  <- cursor.downField("initS").as[String]
          init   <- cursor.downField("init").as[OffsetDateTime]
          first  <- cursor.downField("first").as[Option[OffsetDateTime]]
          latest <- cursor.downField("latest").as[Int]
          prev   <- cursor.downField("prev").as[Option[(String, OffsetDateTime)]]
          zones  <- cursor.downField("zones").as[Seq[Zone]](Decoder.decodeSeq(zoneCodec))
        } yield ForecastMetadata(h, initS, init, first, latest, prev.map(_._2), zones)
      },
      Encoder.instance { forecastMetadata =>
        Json.obj(
          "h" -> Json.fromInt(forecastMetadata.history),
          "initS"  -> Json.fromString(forecastMetadata.initDateString),
          "init"   -> Encoder[OffsetDateTime].apply(forecastMetadata.initDateTime),
          "first"  -> Encoder.encodeOption[OffsetDateTime].apply(forecastMetadata.maybeFirstTimeStep),
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
