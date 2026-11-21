package org.soaringmeteo

import io.circe.Json
import io.circe.parser.parse
import org.slf4j.LoggerFactory

import scala.collection.immutable.ArraySeq
import scala.collection.mutable

/**
 * Foehn index (WRF only): 10 m wind component along the nearest foehn flow line of
 * `frontend/src/data/foehn-valleys.geojson` (within `corridorKm`), gated by the
 * cross-Alpine pressure difference.
 */
object FoehnValleys {

  private val logger = LoggerFactory.getLogger(getClass)

  // --- Tuning
  val corridorKm: Double        = 10.0  // grid cells farther from any flow line get no value
  val sampleSpacingKm: Double   = 1.5   // densification of the digitised lines
  val alongWindMinMps: Double   = 2.0   // along-line wind ramp start
  val alongWindFullMps: Double  = 6.0   // along-line wind ramp saturation
  val pressureMinHPa: Double    = 2.0   // pressure ramp start
  val pressureFullHPa: Double   = 6.0   // pressure ramp saturation

  private val kmPerDegreeLatitude = 111.2
  private val GeoJsonResource = "/foehn-valleys.geojson"

  /** MSLP pair (south point, north point) of a region, and the longitudes it applies to */
  private case class Region(name: String, south: (Double, Double), north: (Double, Double), applies: Double => Boolean)

  private val regions: Seq[Region] = Seq(
    Region("Lugano-Zurich",     (46.00,  8.96), (47.38,  8.57), lon => lon < 10.2),
    Region("Bolzano-Innsbruck", (46.50, 11.33), (47.27, 11.39), lon => lon >= 10.2)
  )

  /** Direction of the foehn flow carried by a line */
  sealed trait Direction {
    def code: Int
    def json: String
  }
  object Direction {
    case object South extends Direction {
      val code: Int = 0
      val json: String = "south"
    }
    case object North extends Direction {
      val code: Int = 1
      val json: String = "north"
    }
    def fromJson(value: String): Option[Direction] =
      value match {
        case "south" => Some(South)
        case "north" => Some(North)
        case _       => None
      }
  }

  /** A densified point of a foehn flow line, with the local flow direction */
  private[soaringmeteo] case class Sample(
    valleyId: String,
    latitude: Double,
    longitude: Double,
    east: Double,  // unit vector, positive eastward
    north: Double, // unit vector, positive northward
    direction: Direction
  )

  private[soaringmeteo] case class Valley(
    id: String,
    direction: Direction,
    samples: IndexedSeq[Sample]
  )

  /**
   * Foehn similarity at a grid point.
   *
   * @param similarity       0–1, ramp of the wind component along the nearest flow line
   * @param index            `similarity` gated by the cross-Alpine pressure difference
   * @param direction        Direction of the nearest flow line, if any
   * @param valleyId         Identifier of the nearest flow line, if any
   * @param distanceMeters   Distance to the nearest flow line
   */
  case class Diagnostics(
    similarity: Double,
    index: Double,
    direction: Option[Direction],
    valleyId: Option[String],
    distanceMeters: Double
  )

  /** Similarity between the model wind and one foehn flow line at one hour */
  case class ValleyScore(
    id: String,
    direction: Direction,
    similarity: Double,
    index: Double,
    pressureDifference: Double // hPa, mean over the line (NaN if unavailable)
  )

  case class Result(
    forecastsByHour: IndexedSeq[IndexedSeq[IndexedSeq[Forecast]]],
    valleyScoresByHour: IndexedSeq[IndexedSeq[ValleyScore]]
  )

  private[soaringmeteo] case class NearestSample(distanceKm: Double, sample: Sample)
  private case class CellTemplates(south: Option[NearestSample], north: Option[NearestSample])
  private case class GridCell(x: Int, y: Int, latitude: Double, longitude: Double)

  /**
   * Fill `Forecast.valleyFoehn` for every point of every time step, and compute the score
   * of each foehn valley at every time step.
   *
   * @param forecastsByHour Grids indexed by time, x (west → east), and y (north → south)
   * @param coordinates     Latitude/longitude of each grid point, indexed by x and y like the forecasts
   */
  def diagnose(
    forecastsByHour: IndexedSeq[IndexedSeq[IndexedSeq[Forecast]]],
    coordinates: IndexedSeq[IndexedSeq[Point]]
  ): Result = {
    val width = coordinates.size
    val height = coordinates.head.size
    val lats = coordinates.map(_.map(_.latitude.doubleValue))
    val lons = coordinates.map(_.map(_.longitude.doubleValue))
    val referenceLatitude =
      if (width == 0 || height == 0) 46.0
      else lats.iterator.flatten.sum / (width * height)

    val sampleIndex = new GeoBucketIndex(allSamples, (sample: Sample) => (sample.latitude, sample.longitude))
    val templates: Array[Array[CellTemplates]] =
      Array.tabulate(width) { x =>
        Array.tabulate(height) { y =>
          nearestTemplates(lats(x)(y), lons(x)(y), referenceLatitude, sampleIndex)
        }
      }

    val cells =
      for {
        x <- 0 until width
        y <- 0 until height
      } yield GridCell(x, y, lats(x)(y), lons(x)(y))
    val gridIndex = new GeoBucketIndex(cells, (cell: GridCell) => (cell.latitude, cell.longitude))

    // Valleys with at least one sample inside (or close to) the domain are exposed to the frontend.
    val scoredValleys =
      valleys.flatMap { valley =>
        val cellsBySample = valley.samples.map(sample => nearestGridCell(sample, referenceLatitude, gridIndex))
        if (cellsBySample.exists(_.nonEmpty)) Some((valley, cellsBySample)) else None
      }

    val pressureDifferencesByHour = pressureDifferences(forecastsByHour, lats, lons)

    val forecastsWithSimilarity =
      forecastsByHour.zip(pressureDifferencesByHour).map { case (forecasts, pressureDifferences) =>
        ArraySeq.tabulate(width) { x =>
          ArraySeq.tabulate(height) { y =>
            val forecast = forecasts(x)(y)
            val pressureDifference = pressureDifferences(x)(y)
            chooseTemplate(templates(x)(y), pressureDifference) match {
              case None =>
                forecast
              case Some(nearest) =>
                val similarity = similarityAt(forecast, nearest.sample)
                val index = pressureGatedIndex(similarity, nearest.sample.direction, pressureDifference)
                forecast.copy(valleyFoehn = Some(Diagnostics(
                  similarity = similarity,
                  index = index,
                  direction = Some(nearest.sample.direction),
                  valleyId = Some(nearest.sample.valleyId),
                  distanceMeters = nearest.distanceKm * 1000
                )))
            }
          }
        }
      }

    val valleyScoresByHour =
      forecastsByHour.zip(pressureDifferencesByHour).map { case (forecasts, pressureDifferences) =>
        scoredValleys.map { case (valley, cellsBySample) =>
          scoreValley(valley, cellsBySample, forecasts, pressureDifferences)
        }
      }

    Result(forecastsWithSimilarity, valleyScoresByHour)
  }

  private def scoreValley(
    valley: Valley,
    cellsBySample: IndexedSeq[Option[(Int, Int)]],
    forecasts: IndexedSeq[IndexedSeq[Forecast]],
    pressureDifferences: IndexedSeq[IndexedSeq[Double]]
  ): ValleyScore = {
    var similaritySum = 0.0
    var sampleCount = 0
    var pressureSum = 0.0
    var pressureCount = 0
    var i = 0
    while (i < cellsBySample.size) {
      cellsBySample(i) match {
        case None =>
        case Some((x, y)) =>
          similaritySum += similarityAt(forecasts(x)(y), valley.samples(i))
          sampleCount += 1
          val pressureDifference = pressureDifferences(x)(y)
          if (java.lang.Double.isFinite(pressureDifference)) {
            pressureSum += pressureDifference
            pressureCount += 1
          }
      }
      i += 1
    }
    val similarity = if (sampleCount == 0) 0.0 else similaritySum / sampleCount
    val meanPressureDifference = if (pressureCount == 0) Double.NaN else pressureSum / pressureCount
    val index = pressureGatedIndex(similarity, valley.direction, meanPressureDifference)
    ValleyScore(valley.id, valley.direction, similarity, index, meanPressureDifference)
  }

  /** MSLP(south) − MSLP(north) in hPa of the region of each grid point, at each hour (NaN if unavailable) */
  private def pressureDifferences(
    forecastsByHour: IndexedSeq[IndexedSeq[IndexedSeq[Forecast]]],
    lats: IndexedSeq[IndexedSeq[Double]],
    lons: IndexedSeq[IndexedSeq[Double]]
  ): IndexedSeq[IndexedSeq[IndexedSeq[Double]]] = {
    // MSLP is zero-filled by the WRF post-processing above 800 m
    val firstGrid = forecastsByHour.head
    val stationPoints: Map[(Double, Double), Option[Seq[(Int, Int)]]] =
      regions.flatMap(r => Seq(r.south, r.north)).map { station =>
        station -> pointsAround(station, lats, lons, (x, y) => firstGrid(x)(y).mslet.toPascals > 0)
      }.toMap
    val availableRegions = regions.filter(r => stationPoints(r.south).isDefined && stationPoints(r.north).isDefined)

    forecastsByHour.map { forecasts =>
      def meanMslp(points: Seq[(Int, Int)]): Double =
        points.map { case (x, y) => forecasts(x)(y).mslet.toPascals / 100 }.sum / points.size
      val differenceByRegion: Map[String, Double] =
        availableRegions.map(r => r.name -> (meanMslp(stationPoints(r.south).get) - meanMslp(stationPoints(r.north).get))).toMap
      lons.map(_.map { lon =>
        availableRegions.find(_.applies(lon)).orElse(availableRegions.headOption)
          .fold(Double.NaN)(region => differenceByRegion(region.name))
      })
    }
  }

  /** Grid points with `valid` data within 20 km of `station`, extending the search up to 150 km */
  private def pointsAround(
    station: (Double, Double),
    lats: IndexedSeq[IndexedSeq[Double]],
    lons: IndexedSeq[IndexedSeq[Double]],
    valid: (Int, Int) => Boolean
  ): Option[Seq[(Int, Int)]] = {
    val (lat, lon) = station
    val cosLat = math.cos(math.toRadians(lat))
    val distances =
      for {
        x <- lats.indices
        y <- lats(x).indices
        if valid(x, y)
      } yield {
        val dy = (lats(x)(y) - lat) * kmPerDegreeLatitude
        val dx = (lons(x)(y) - lon) * kmPerDegreeLatitude * cosLat
        ((x, y), math.hypot(dx, dy))
      }
    LazyList.iterate(20.0)(_ + 10.0).takeWhile(_ <= 150.0)
      .map(radius => distances.collect { case (point, d) if d <= radius => point })
      .find(_.sizeIs >= 3)
  }

  private def nearestTemplates(
    latitude: Double,
    longitude: Double,
    referenceLatitude: Double,
    sampleIndex: GeoBucketIndex[Sample]
  ): CellTemplates = {
    def closest(direction: Direction): Option[NearestSample] =
      sampleIndex.nearby(latitude, longitude)
        .filter(_.direction == direction)
        .map(sample => NearestSample(planarDistanceKm(latitude, longitude, sample.latitude, sample.longitude, referenceLatitude), sample))
        .filter(_.distanceKm <= corridorKm)
        .minByOption(_.distanceKm)
    CellTemplates(closest(Direction.South), closest(Direction.North))
  }

  private def nearestGridCell(
    sample: Sample,
    referenceLatitude: Double,
    gridIndex: GeoBucketIndex[GridCell]
  ): Option[(Int, Int)] =
    gridIndex.nearby(sample.latitude, sample.longitude)
      .map(cell => (cell, planarDistanceKm(sample.latitude, sample.longitude, cell.latitude, cell.longitude, referenceLatitude)))
      .minByOption(_._2)
      .filter(_._2 <= corridorKm)
      .map { case (cell, _) => (cell.x, cell.y) }

  private def chooseTemplate(templates: CellTemplates, pressureDifference: Double): Option[NearestSample] =
    chooseTemplate(templates.south, templates.north, pressureDifference)

  /**
   * Prefer the flow direction implied by the pressure difference, but still report the other
   * direction when no line of the preferred direction is nearby. The index is zeroed by
   * [[pressureGatedIndex]] in that case, so the wind similarity remains available to explain
   * why a nearby foehn line does not match the current pressure pattern.
   */
  private[soaringmeteo] def chooseTemplate(
    south: Option[NearestSample],
    north: Option[NearestSample],
    pressureDifference: Double
  ): Option[NearestSample] =
    if (pressureDifference > 0) south.orElse(north)
    else if (pressureDifference < 0) north.orElse(south)
    else {
      (south, north) match {
        case (Some(s), Some(n)) => Some(if (s.distanceKm <= n.distanceKm) s else n)
        case (s, n)             => s.orElse(n)
      }
    }

  /** The pressure-gated index, only when the reported line has the direction implied by the pressure difference */
  private[soaringmeteo] def pressureGatedIndex(
    similarity: Double,
    direction: Direction,
    pressureDifference: Double
  ): Double =
    if ((direction == Direction.South && pressureDifference > 0) ||
        (direction == Direction.North && pressureDifference < 0)) {
      similarity * pressureGate(pressureDifference)
    } else 0.0

  private def similarityAt(forecast: Forecast, sample: Sample): Double =
    windSimilarity(
      sample,
      forecast.surfaceWind.u.toMetersPerSecond,
      forecast.surfaceWind.v.toMetersPerSecond
    )

  /** Ramp of the wind component along the flow line tangent */
  private[soaringmeteo] def windSimilarity(sample: Sample, u: Double, v: Double): Double =
    ramp(alongWindMinMps, alongWindFullMps, u * sample.east + v * sample.north)

  private def pressureGate(pressureDifference: Double): Double =
    if (java.lang.Double.isFinite(pressureDifference)) ramp(pressureMinHPa, pressureFullHPa, math.abs(pressureDifference))
    else 0.0

  /** Linear 0–1 transition between `from` and `to` */
  private def ramp(from: Double, to: Double, value: Double): Double =
    math.max(0.0, math.min(1.0, (value - from) / (to - from)))

  private def planarDistanceKm(
    latitude1: Double,
    longitude1: Double,
    latitude2: Double,
    longitude2: Double,
    referenceLatitude: Double
  ): Double = {
    val north = (latitude2 - latitude1) * kmPerDegreeLatitude
    val east = (longitude2 - longitude1) * kmPerDegreeLatitude * math.cos(math.toRadians(referenceLatitude))
    math.hypot(east, north)
  }

  private class GeoBucketIndex[A](
    items: IndexedSeq[A],
    position: A => (Double, Double)
  ) {
    private val latitudeStep = corridorKm / kmPerDegreeLatitude
    // Use the highest latitude of the indexed items, so that a bucket is at least
    // `corridorKm` wide even at its northern edge (longitude degrees shrink with latitude).
    private val maxAbsLatitude = items.iterator.map(item => math.abs(position(item)._1)).maxOption.getOrElse(0.0)
    private val longitudeStep = corridorKm / (kmPerDegreeLatitude * math.cos(math.toRadians(math.min(80.0, maxAbsLatitude + 1.0))))
    private val buckets: Map[(Int, Int), IndexedSeq[A]] = {
      val builder = mutable.HashMap.empty[(Int, Int), mutable.ArrayBuffer[A]]
      items.foreach { item =>
        val (latitude, longitude) = position(item)
        val key = (math.floor(latitude / latitudeStep).toInt, math.floor(longitude / longitudeStep).toInt)
        builder.getOrElseUpdate(key, mutable.ArrayBuffer.empty) += item
      }
      builder.iterator.map { case (key, values) => key -> values.toIndexedSeq }.toMap
    }

    /** Items in the same or an adjacent bucket; contains every item within `corridorKm` */
    def nearby(latitude: Double, longitude: Double): Iterator[A] = {
      val latitudeBucket = math.floor(latitude / latitudeStep).toInt
      val longitudeBucket = math.floor(longitude / longitudeStep).toInt
      Iterator.tabulate(9) { i =>
        val key = (latitudeBucket + (i / 3) - 1, longitudeBucket + (i % 3) - 1)
        buckets.getOrElse(key, IndexedSeq.empty)
      }.flatten
    }
  }

  private[soaringmeteo] lazy val valleys: IndexedSeq[Valley] = loadValleys()

  private[soaringmeteo] lazy val allSamples: IndexedSeq[Sample] =
    valleys.flatMap(_.samples)

  private def loadValleys(): IndexedSeq[Valley] = {
    val json = parse(readResource(GeoJsonResource)).fold(
      error => throw new IllegalStateException(s"Unable to parse $GeoJsonResource: ${error.getMessage}"),
      identity
    )
    val features = json.hcursor.downField("features").as[Vector[Json]].getOrElse(Vector.empty)
    val loaded = features.flatMap { feature =>
      val cursor = feature.hcursor
      val properties = cursor.downField("properties")
      for {
        id <- properties.get[String]("id").toOption
        direction <- properties.get[String]("foehn").toOption.flatMap(Direction.fromJson)
        coordinates <- cursor.downField("geometry").downField("coordinates").as[Vector[Vector[Double]]].toOption
        if coordinates.sizeIs >= 2
      } yield Valley(id, direction, densify(id, coordinates, direction))
    }
    logger.info(s"Loaded ${loaded.size} foehn valleys (${loaded.map(_.samples.size).sum} densified samples)")
    loaded
  }

  private def readResource(path: String): String = {
    val stream = Option(getClass.getResourceAsStream(path)).getOrElse {
      throw new IllegalStateException(s"Missing resource $path")
    }
    try scala.io.Source.fromInputStream(stream, "UTF-8").mkString
    finally stream.close()
  }

  private def densify(
    valleyId: String,
    coordinates: IndexedSeq[Vector[Double]],
    direction: Direction
  ): IndexedSeq[Sample] = {
    val points = coordinates.map(coordinate => (coordinate(1), coordinate(0))) // (latitude, longitude)
    val samples = mutable.ArrayBuffer.empty[Sample]

    def unitDirection(from: (Double, Double), to: (Double, Double)): Option[(Double, Double)] = {
      val meanLatitude = (from._1 + to._1) / 2
      val east = (to._2 - from._2) * math.cos(math.toRadians(meanLatitude))
      val north = to._1 - from._1
      val norm = math.hypot(east, north)
      Option.when(norm > 0)((east / norm, north / norm))
    }

    def addSample(latitude: Double, longitude: Double, unit: (Double, Double)): Unit =
      samples += Sample(valleyId, latitude, longitude, unit._1, unit._2, direction)

    for (i <- 0 until points.size - 1) {
      val from = points(i)
      val to = points(i + 1)
      val segmentLength = planarDistanceKm(from._1, from._2, to._1, to._2, (from._1 + to._1) / 2)
      if (segmentLength > 0) {
        unitDirection(from, to).foreach { unit =>
          val sampleCount = math.max(1, math.ceil(segmentLength / sampleSpacingKm).toInt)
          for (j <- 0 until sampleCount) {
            val q = j.toDouble / sampleCount
            addSample(
              from._1 + q * (to._1 - from._1),
              from._2 + q * (to._2 - from._2),
              unit
            )
          }
        }
      }
    }
    // The final point is the arrow tip and is useful for scoring the downstream end of the valley.
    if (points.sizeIs >= 2) {
      unitDirection(points(points.size - 2), points.last).foreach(unit =>
        addSample(points.last._1, points.last._2, unit)
      )
    }
    samples.toIndexedSeq
  }

  /** JSON document consumed by the frontend (`foehn-valleys.json`), one entry per valley */
  def toJson(scoresByHour: IndexedSeq[IndexedSeq[ValleyScore]]): Json = {
    val firstHour = scoresByHour.headOption.getOrElse(IndexedSeq.empty)
    val valleysJson =
      firstHour.zipWithIndex.map { case (first, i) =>
        Json.obj(
          "id" -> Json.fromString(first.id),
          "foehn" -> Json.fromString(first.direction.json),
          "hours" -> Json.arr(
            scoresByHour.map { hour =>
              val score = hour(i)
              Json.obj(
                "s" -> permille(score.similarity),
                "i" -> permille(score.index),
                "dp" -> tenths(score.pressureDifference)
              )
            }: _*
          )
        )
      }
    Json.obj("valleys" -> Json.arr(valleysJson: _*))
  }

  private def permille(value: Double): Json =
    if (java.lang.Double.isFinite(value)) Json.fromInt((value * 1000).round.toInt) else Json.Null

  private def tenths(value: Double): Json =
    if (java.lang.Double.isFinite(value)) Json.fromInt((value * 10).round.toInt) else Json.Null

}
