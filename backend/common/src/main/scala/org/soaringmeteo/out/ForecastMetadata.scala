package org.soaringmeteo.out

import geotrellis.vector.Extent
import io.circe

import java.time.{OffsetDateTime, Period}
import io.circe.{Codec, Decoder, Encoder, Json}

import scala.util.Try

/**
 * Description of the forecast data (consumed by the frontend).
 * @param dataPath         Path prefix for generated file names
 * @param initDateTime     Initialization time of the forecast
 * @param latestHourOffset Offset (in number of hours from the init time) of the latest period of forecast
 * @param maybeFirstTimeStep Time of the first time-step (when hourOffset is zero), if different from the initialization time
 * @param zones Zones covered by the forecast
 */
case class ForecastMetadata(
  dataPath: String,
  initDateTime: OffsetDateTime,
  maybeFirstTimeStep: Option[OffsetDateTime],
  latestHourOffset: Int,
  zones: Seq[ForecastMetadata.Zone]
) {

  /**
   * @return The first date-time covered by the forecast. Typically,
   *         the first date-time of GFS forecasts is their
   *         initialization time, whereas the first date-time of WRF
   *         forecasts is defined by `maybeFirstTimeStep`.
   */
  def firstDateTime: OffsetDateTime = maybeFirstTimeStep.getOrElse(initDateTime)

}

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
   * @param tileSize Number of pixels of a vector tile. By default, OpenLayers assumes a
   *                 size of 512 px, but we can tune this value to adjust the density of
   *                 wind arrows per zone.
   */
  case class VectorTiles(extent: Extent, zoomLevels: Int, minZoom: Int, tileSize: Int)

  object VectorTiles {
    def apply(parameters: org.soaringmeteo.out.VectorTiles.Parameters, tileSize: Int): VectorTiles =
      VectorTiles(
        parameters.extent,
        parameters.zoomLevels,
        parameters.minViewZoom,
        tileSize
      )
  }

  /**
   * Overwrite the content of the file `forecast.json` to describe the forecasts currently
   * exposed to the frontend.
   *
   * @param targetDir Model target directory (e.g., /data/3/gfs or /data/3/wrf)
   * @param history   Retention period of previous forecast runs
   * @return The collection of forecasts (previous and latest) exposed to the frontend,
   *         sorted by first date-time.
   */
  def overwriteLatestForecastMetadata(
    targetDir: os.Path,
    history: Period,
    initDateString: String,
    initDateTime: OffsetDateTime,
    maybeFirstTimeStep: Option[OffsetDateTime],
    latestHourOffset: Int,
    zones: Seq[Zone]
  ): Seq[ForecastMetadata] = {
    val latestForecastPath = targetDir / "forecast.json"
    val maybePreviousForecasts =
      for {
        _ <- Option.when(os.exists(latestForecastPath))(())
        str <- Try(os.read(latestForecastPath)).toOption // FIXME Log more errors
        json <- circe.parser.parse(str).toOption
        metadata <- Decoder.decodeSeq(ForecastMetadata.jsonCodec).decodeJson(json).toOption
      } yield metadata

    val latestForecast =
      ForecastMetadata(
        initDateString,
        initDateTime,
        maybeFirstTimeStep,
        latestHourOffset,
        zones
      )

    val mergedForecasts: Seq[ForecastMetadata] =
      updateForecasts(latestForecast, maybePreviousForecasts.getOrElse(Nil), history)

    os.write.over(
      latestForecastPath,
      Encoder.encodeSeq(jsonCodec)(mergedForecasts).deepDropNullValues.noSpaces
    )
    mergedForecasts
  }

  /**
   * @return The updated list of forecasts to expose to the frontend. The list is sorted by forecast start time, it
   *         includes the latest forecast and removes any of the previous forecasts for the same start time as the
   *         latest one, and any forecast whose initialization date is older than `oldestForecastToKeep`.
   * @param latestForecast    Latest forecast to insert into the collection
   * @param previousForecasts Previous forecasts. We assume the previous forecasts are also sorted.
   * @param forecastHistory   Retention period for old forecasts
   */
  private[out] def updateForecasts(
    latestForecast: ForecastMetadata,
    previousForecasts: Seq[ForecastMetadata],
    forecastHistory: Period
  ): Seq[ForecastMetadata] = {
    val oldestForecastToKeep = latestForecast.initDateTime.minus(forecastHistory)
    val builder = Seq.newBuilder[ForecastMetadata]
    var inserted: Boolean = false
    for {
      forecast <- previousForecasts
      if !forecast.initDateTime.isBefore(oldestForecastToKeep)
     } {
      if (inserted) {
        // We already inserted the latest forecast, just copy the remaining forecasts
        builder += forecast
      } else if (forecast.firstDateTime == latestForecast.firstDateTime) {
        // Replace `forecast` with `latestForecast` in the result
        builder += latestForecast
        inserted = true
      } else if (forecast.firstDateTime.isAfter(latestForecast.firstDateTime)) {
        // Insert `latestForecast` before `forecast`
        builder += latestForecast
        inserted = true
        builder += forecast
      } else {
        // Only insert `forecast`
        builder += forecast
      }
    }
    // In case we did not insert the `latestForecast` in the result (because it is after all the previous forecasts, or there were no previous forecasts),
    // insert it at the end.
    if (!inserted) {
      builder += latestForecast
    }
    builder.result()
  }

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
            tileSize <- cursor.downField("tileSize").as[Int]
          } yield VectorTiles(extent, zoomLevels, minZoom, tileSize)
        },
        Encoder.instance { tiles =>
          Json.obj(
            "extent" -> extentCodec(tiles.extent),
            "zoomLevels" -> Json.fromInt(tiles.zoomLevels),
            "minZoom" -> Json.fromInt(tiles.minZoom),
            "tileSize" -> Json.fromInt(tiles.tileSize),
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
          path  <- cursor.downField("path").as[String]
          init   <- cursor.downField("init").as[OffsetDateTime]
          first  <- cursor.downField("first").as[Option[OffsetDateTime]]
          latest <- cursor.downField("latest").as[Int]
          zones  <- cursor.downField("zones").as[Seq[Zone]](Decoder.decodeSeq(zoneCodec))
        } yield ForecastMetadata(path, init, first, latest, zones)
      },
      Encoder.instance { forecastMetadata =>
        Json.obj(
          "path"  -> Json.fromString(forecastMetadata.dataPath),
          "init"   -> Encoder[OffsetDateTime].apply(forecastMetadata.initDateTime),
          "first"  -> Encoder.encodeOption[OffsetDateTime].apply(forecastMetadata.maybeFirstTimeStep),
          "latest" -> Json.fromInt(forecastMetadata.latestHourOffset),
          "zones"  -> Encoder.encodeSeq(zoneCodec)(forecastMetadata.zones)
        )
      }
    )
  }

}
