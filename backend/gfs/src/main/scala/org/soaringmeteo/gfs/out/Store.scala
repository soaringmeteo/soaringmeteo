package org.soaringmeteo.gfs.out

import io.circe.{Codec, Decoder, DecodingFailure, Encoder, Json, JsonObject, parser}
import org.soaringmeteo.{AirData, ConvectiveClouds, Forecast, Wind, Winds}
import org.soaringmeteo.gfs.Subgrid
import slick.jdbc.H2Profile.api._
import squants.energy.Grays
import squants.motion.{KilometersPerHour, MetersPerSecond, Pascals}
import squants.radio.WattsPerSquareMeter
import squants.space.{Length, Meters, Millimeters}
import squants.thermal.Celsius

import java.time.OffsetDateTime
import scala.collection.immutable.SortedMap
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future

/**
 * The on-disk storage system is used as a temporary storage (we don’t need it
 * to be durable) to avoid keeping everything in-memory.
 */
object Store {

  private val db = Database.forConfig("h2db")

  // --- Schema model
  private class GfsGrids(tag: Tag) extends Table[(OffsetDateTime, String, Int, Int, Int, String)](tag, "gfs_grids") {
    def initTime = column[OffsetDateTime]("init_time")
    def subgrid = column[String]("subgrid")
    def hourOffset = column[Int]("hour_offset")
    def x = column[Int]("x")
    def y = column[Int]("y")
    def forecastData = column[String]("data")
    def * = (initTime, subgrid, hourOffset, x, y, forecastData)

    def pk = primaryKey("pk", (initTime, subgrid, hourOffset, x, y))
    def spatialAccess = index("spatial_access", (initTime, subgrid, x, y))
  }

  private val gfsGrids = TableQuery(tag => new GfsGrids(tag))

  // --- Pre-compiled queries (slightly improves performance)

  private val subgridForInitTimeAndHourOffset = Compiled { (initTime: Rep[OffsetDateTime], subgridId: Rep[String], hourOffset: Rep[Int]) =>
    gfsGrids.filter(grid => grid.initTime === initTime && grid.subgrid === subgridId && grid.hourOffset === hourOffset)
  }

  private val subgridCountForInitTimeAndHourOffset = Compiled { (initTime: Rep[OffsetDateTime], subgridId: Rep[String], hourOffset: Rep[Int]) =>
    gfsGrids
      .filter(grid => grid.initTime === initTime && grid.subgrid === subgridId && grid.hourOffset === hourOffset)
      .length
  }

  private val forecastsForInitTimeAndLocation = Compiled { (initTime: Rep[OffsetDateTime], subgridId: Rep[String], x: Rep[Int], y: Rep[Int]) =>
    for {
      grid <- gfsGrids
      if grid.initTime === initTime && grid.subgrid === subgridId && grid.x === x && grid.y === y
    } yield (grid.hourOffset, grid.forecastData)
  }

  // Must be called before any operation on the database
  def ensureSchemaExists(): Future[Unit] = {
    for {
      exists <- db.run(
        sql"""
              SELECT EXISTS (
                SELECT * FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_NAME = 'gfs_grids'
              )
          """.as[Boolean].head)
      _ <-
        if (exists) Future.successful(())
        else db.run(gfsGrids.schema.create)
    } yield ()
  }

  def close(): Unit = {
    db.close()
  }

  def save(initTime: OffsetDateTime, subgrid: Subgrid, hourOffset: Int, forecasts: IndexedSeq[IndexedSeq[Forecast]]): Future[Unit] = {
    val cleanupAction =
      subgridForInitTimeAndHourOffset(initTime, subgrid.id, hourOffset).delete
    val newRows =
      for {
        (columns, x)  <- forecasts.zipWithIndex
        (forecast, y) <- columns.zipWithIndex
      } yield (initTime, subgrid.id, hourOffset, x, y, jsonCodec(forecast).noSpaces)
    val insertAction = gfsGrids ++= newRows
    db.run(cleanupAction >> insertAction)
      .map(inserted => assert(inserted.contains(newRows.size)))
  }

  def exists(initTime: OffsetDateTime, subgrid: Subgrid, hourOffset: Int): Future[Boolean] = {
    val action =
      subgridCountForInitTimeAndHourOffset(initTime, subgrid.id, hourOffset).result
    db
      .run(action)
      .map(_ == subgrid.size)
  }

  def deleteAll(): Future[Unit] = {
    db.run(sqlu"""TRUNCATE TABLE "gfs_grids"""").map(_ => ())
  }

  /** Fetches back all the forecast over time for a given location `x`-`y`,
   * provided in the subgrid coordinate system.
   */
  def forecastForLocation(initTime: OffsetDateTime, subgrid: Subgrid, x: Int, y: Int, relevantHourOffsets: Set[Int]): Future[Map[Int, Forecast]] = {
    val action =
      forecastsForInitTimeAndLocation(initTime, subgrid.id, x, y).result
    for {
      rows <- db.run(action)
    } yield
      rows
        .view
        .filter { case (hourOffset, _) => relevantHourOffsets.contains(hourOffset) }
        .map { case (hourOffset, data) => (hourOffset, decodeDataOrFail(data)) }
        .toMap
  }

  private def decodeDataOrFail(data: String): Forecast = {
    val json = parser.parse(data).getOrElse(sys.error(s"Unable to parse JSON data: ${data}"))
    jsonCodec.decodeJson(json).getOrElse(sys.error(s"Unable to decode JSON data: ${json}"))
  }

  // The following only describe how to serialize/deserialize a forecast
  private val jsonCodec: Codec[Forecast] = {
    val windCodec: Codec[Wind] = Codec.from(
      Decoder.instance { cursor =>
        for {
          u <- cursor.downField("u").as[Int].map(KilometersPerHour(_))
          v <- cursor.downField("v").as[Int].map(KilometersPerHour(_))
        } yield Wind(u, v)
      },
      Encoder.instance { wind =>
        Json.obj(
          "u" -> Json.fromInt(wind.u.toKilometersPerHour.round.intValue),
          "v" -> Json.fromInt(wind.v.toKilometersPerHour.round.intValue)
        )
      }
    )

    val airDataCodec: Codec[AirData] = Codec.from(
      Decoder.instance { cursor =>
        for {
          wind <- cursor.downField("wind").as(windCodec)
          temperature <- cursor.downField("temperature").as[Int].map(Celsius(_))
          dewPoint <- cursor.downField("dewPoint").as[Int].map(Celsius(_))
          cloudCover <- cursor.downField("cloudCover").as[Int]
        } yield AirData(wind, temperature, dewPoint, cloudCover)
      },
      Encoder.instance { airData =>
        Json.obj(
          "wind" -> windCodec(airData.wind),
          "temperature" -> Json.fromInt(airData.temperature.toCelsiusScale.round.intValue),
          "dewPoint" -> Json.fromInt(airData.dewPoint.toCelsiusScale.round.intValue),
          "cloudCover" -> Json.fromInt(airData.cloudCover)
        )
      }
    )

    val convectiveCloudsCodec: Codec[ConvectiveClouds] = Codec.from(
      Decoder.instance { cursor =>
        for {
          bottom <- cursor.downField("bottom").as[Int].map(Meters(_))
          top <- cursor.downField("top").as[Int].map(Meters(_))
        } yield ConvectiveClouds(bottom, top)
      },
      Encoder.instance { convectiveClouds =>
        Json.obj(
          "bottom" -> Json.fromInt(convectiveClouds.bottom.toMeters.round.intValue),
          "top" -> Json.fromInt(convectiveClouds.top.toMeters.round.intValue)
        )
      }
    )

    val windsCodec: Codec[Winds] = Codec.from(
      Decoder.instance { cursor =>
        for {
          w300 <- cursor.downField("300m").as(windCodec)
          soaringLayerTop <- cursor.downField("soaringLayerTop").as(windCodec)
          w2000 <- cursor.downField("2000m").as(windCodec)
          w3000 <- cursor.downField("3000m").as(windCodec)
          w4000 <- cursor.downField("4000m").as(windCodec)
        } yield Winds(w300, soaringLayerTop, w2000, w3000, w4000)
      },
      Encoder.instance { winds =>
        Json.obj(
          "300m" -> windCodec(winds.`300m AGL`),
          "soaringLayerTop" -> windCodec(winds.soaringLayerTop),
          "2000m" -> windCodec(winds.`2000m AMSL`),
          "3000m" -> windCodec(winds.`3000m AMSL`),
          "4000m" -> windCodec(winds.`4000m AMSL`),
        )
      }
    )

    val encoder: Encoder[Forecast] = Encoder.instance { forecast =>
      Json.obj(
        "time" -> Encoder[OffsetDateTime].apply(forecast.time),
        "elevation" -> Json.fromInt(forecast.elevation.toMeters.round.intValue),
        "boundaryLayerDepth" -> Json.fromInt(forecast.boundaryLayerDepth.toMeters.round.intValue),
        "boundaryLayerWind" -> windCodec(forecast.boundaryLayerWind),
        "thermalVelocity" -> Json.fromBigDecimal(BigDecimal(forecast.thermalVelocity.toMetersPerSecond)),
        "totalCloudCover" -> Json.fromInt(forecast.totalCloudCover),
        "convectiveCloudCover" -> Json.fromInt(forecast.convectiveCloudCover),
        "convectiveClouds" -> forecast.convectiveClouds.fold(Json.Null)(convectiveCloudsCodec(_)),
        "airData" -> Json.obj(
          forecast.airDataByAltitude.map { case (elevation, airData) =>
            elevation.toMeters.intValue.toString -> airDataCodec(airData)
          }.toSeq: _*
        ),
        "mslet" -> Json.fromInt(forecast.mslet.toPascals.round.intValue),
        "snowDepth" -> Json.fromInt(forecast.snowDepth.toMillimeters.round.intValue),
        "surfaceTemperature" -> Json.fromInt(forecast.surfaceTemperature.toCelsiusScale.round.intValue),
        "surfaceDewPoint" -> Json.fromInt(forecast.surfaceDewPoint.toCelsiusScale.round.intValue),
        "surfaceWind" -> windCodec(forecast.surfaceWind),
        "totalRain" -> Json.fromInt(forecast.totalRain.toMillimeters.round.intValue),
        "convectiveRain" -> Json.fromInt(forecast.convectiveRain.toMillimeters.round.intValue),
        "latentHeat" -> Json.fromInt(forecast.latentHeatNetFlux.toWattsPerSquareMeter.round.intValue),
        "sensibleHeat" -> Json.fromInt(forecast.sensibleHeatNetFlux.toWattsPerSquareMeter.round.intValue),
        "cape" -> Json.fromBigDecimal(BigDecimal(forecast.cape.toGrays)),
        "cin" -> Json.fromBigDecimal(BigDecimal(forecast.cin.toGrays)),
        "irradiance" -> Json.fromInt(forecast.downwardShortWaveRadiationFlux.toWattsPerSquareMeter.round.intValue),
        "isothermZero" -> forecast.isothermZero.fold(Json.Null)(elevation => Json.fromInt(elevation.toMeters.round.intValue)),
        "winds" -> windsCodec(forecast.winds),
        "xcFlyingPotential" -> Json.fromInt(forecast.xcFlyingPotential),
        "soaringLayerDepth" -> Json.fromInt(forecast.soaringLayerDepth.toMeters.round.intValue)
      )
    }

    val decoder: Decoder[Forecast] = Decoder.instance { cursor =>
      for {
        time <- cursor.downField("time").as[OffsetDateTime]
        elevation <- cursor.downField("elevation").as[Int].map(Meters(_))
        boundaryLayerDepth <- cursor.downField("boundaryLayerDepth").as[Int].map(Meters(_))
        boundaryLayerWind <- cursor.downField("boundaryLayerWind").as(windCodec)
        thermalVelocity <- cursor.downField("thermalVelocity").as[BigDecimal].map(x => MetersPerSecond(x.doubleValue))
        totalCloudCover <- cursor.downField("totalCloudCover").as[Int]
        convectiveCloudCover <- cursor.downField("convectiveCloudCover").as[Int]
        convectiveClouds <- cursor.downField("convectiveClouds").as[Json].flatMap {
          case Json.Null => Right(None)
          case json => convectiveCloudsCodec.decodeJson(json).map(Some(_))
        }
        airData <- cursor.downField("airData").as(Decoder.instance { cursor2 =>
          cursor2.as[JsonObject].flatMap { obj =>
            obj.toIterable.foldLeft[Decoder.Result[IndexedSeq[(Length, AirData)]]](Right(IndexedSeq.empty)) { case (acc, (k, v)) =>
              val result =
                for {
                  elevation <- k.toIntOption.map(Meters(_)).toRight(DecodingFailure("Key should be an integer", Nil))
                  airData <- airDataCodec.decodeJson(v)
                } yield (elevation, airData)
              for {
                previousResults <- acc
                entry <- result
              } yield previousResults :+ entry
            }
          }
        }.map(_.to(SortedMap)))
        mslet <- cursor.downField("mslet").as[Int].map(Pascals(_))
        snowDepth <- cursor.downField("snowDepth").as[Int].map(Millimeters(_))
        surfaceTemperature <- cursor.downField("surfaceTemperature").as[Int].map(Celsius(_))
        surfaceDewPoint <- cursor.downField("surfaceDewPoint").as[Int].map(Celsius(_))
        surfaceWind <- cursor.downField("surfaceWind").as(windCodec)
        totalRain <- cursor.downField("totalRain").as[Int].map(Millimeters(_))
        convectiveRain <- cursor.downField("convectiveRain").as[Int].map(Millimeters(_))
        latentHeatNetFlux <- cursor.downField("latentHeat").as[Int].map(WattsPerSquareMeter(_))
        sensibleHeatNetFlux <- cursor.downField("sensibleHeat").as[Int].map(WattsPerSquareMeter(_))
        cape <- cursor.downField("cape").as[BigDecimal].map(Grays(_))
        cin <- cursor.downField("cin").as[BigDecimal].map(Grays(_))
        downwardShortWaveRadiationFlux <- cursor.downField("irradiance").as[Int].map(WattsPerSquareMeter(_))
        isothermZero <- cursor.downField("isothermZero").as[Json].flatMap {
          case Json.Null => Right(None)
          case json => Decoder[Int].decodeJson(json).map(elevation => Some(Meters(elevation)))
        }
        winds <- cursor.downField("winds").as(windsCodec)
        xcFlyingPotential <- cursor.downField("xcFlyingPotential").as[Int]
        soaringLayerDepth <- cursor.downField("soaringLayerDepth").as[Int].map(Meters(_))
      } yield
        Forecast(
          time,
          elevation,
          boundaryLayerDepth,
          boundaryLayerWind,
          thermalVelocity,
          totalCloudCover,
          convectiveCloudCover,
          convectiveClouds,
          airData,
          mslet,
          snowDepth,
          surfaceTemperature,
          surfaceDewPoint,
          surfaceWind,
          totalRain,
          convectiveRain,
          latentHeatNetFlux,
          sensibleHeatNetFlux,
          cape,
          cin,
          downwardShortWaveRadiationFlux,
          isothermZero,
          winds,
          xcFlyingPotential,
          soaringLayerDepth
        )
    }

    Codec.from(decoder, encoder)
  }

}
