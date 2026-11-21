package org.soaringmeteo

import FoehnValleys.{Direction, NearestSample, ValleyScore, allSamples, chooseTemplate, pressureGatedIndex, valleys, windSimilarity}
import squants.energy.Grays
import squants.motion.{MetersPerSecond, Pascals}
import squants.radio.WattsPerSquareMeter
import squants.space.Meters
import squants.thermal.Celsius
import verify.BasicTestSuite

import java.time.OffsetDateTime
import scala.collection.immutable.SortedMap

object FoehnValleysTestSuite extends BasicTestSuite {

  test("the digitised foehn valleys are loaded from the shared resource") {
    assert(valleys.size == 83)
    assert(allSamples.nonEmpty)
    assert(valleys.count(_.direction == Direction.South) == 65)
    assert(valleys.count(_.direction == Direction.North) == 18)
    assert(valleys.flatMap(_.samples).forall(_.valleyId.nonEmpty))
  }

  test("south foehn lines flow northward and north foehn lines flow southward") {
    val south = valleys.find(_.id == "S18").get
    val north = valleys.find(_.id == "N00").get
    assert(south.samples.head.north > 0)
    assert(north.samples.head.north < 0)
  }

  test("wind similarity is a wind-speed ramp times a direction gate") {
    val sample = valleys.find(_.id == "S18").get.samples.head
    def similarity(speed: Double, degrees: Double): Double = {
      val angle = math.toRadians(degrees)
      val east = sample.east * math.cos(angle) - sample.north * math.sin(angle)
      val north = sample.east * math.sin(angle) + sample.north * math.cos(angle)
      windSimilarity(sample, east * speed, north * speed)
    }
    assert(math.abs(similarity(10, 0) - 1.0) < 1e-9)
    assert(math.abs(similarity(10, 30) - 1.0) < 1e-9)
    assert(math.abs(similarity(4, 0) - 0.5) < 1e-9)
    assert(math.abs(similarity(10, 45) - 0.5) < 1e-9)
    assert(math.abs(similarity(4, 45) - 0.25) < 1e-9)
    assert(similarity(10, 60) < 1e-9)
    assert(similarity(15, 80) == 0.0)
    assert(similarity(2, 0) == 0.0)
    assert(similarity(10, 180) == 0.0)
    assert(similarity(0, 0) == 0.0)
  }

  test("the pressure direction falls back to the other line when the preferred direction is missing") {
    val south = NearestSample(1.0, valleys.find(_.id == "S18").get.samples.head)
    val north = NearestSample(2.0, valleys.find(_.id == "N00").get.samples.head)
    assert(chooseTemplate(Some(south), None, 4.0).contains(south))
    assert(chooseTemplate(None, Some(north), 4.0).contains(north))
    assert(chooseTemplate(Some(south), None, -4.0).contains(south))
    assert(chooseTemplate(None, Some(north), -4.0).contains(north))
    assert(chooseTemplate(Some(south), Some(north), 0.0).contains(south))
  }

  test("the pressure-gated helper zeroes a line that contradicts the pressure difference") {
    assert(pressureGatedIndex(0.8, Direction.South, 4.0) > 0)
    assert(pressureGatedIndex(0.8, Direction.South, -4.0) == 0)
    assert(pressureGatedIndex(0.8, Direction.North, -4.0) > 0)
    assert(pressureGatedIndex(0.8, Direction.North, 4.0) == 0)
    assert(pressureGatedIndex(0.8, Direction.South, Double.NaN) == 0)
  }

  test("valley scores are encoded in per-mille units") {
    val json = FoehnValleys.toJson(IndexedSeq(IndexedSeq(
      ValleyScore("S18", Direction.South, similarity = 0.8, index = 0.6, pressureDifference = 4.5)
    )))
    assert(json.hcursor.get[String]("version").contains(FoehnValleys.version))
    val valley = json.hcursor.downField("valleys").downArray
    assert(valley.get[String]("id").contains("S18"))
    assert(valley.downField("hours").downArray.get[Int]("s").contains(800))
    assert(valley.downField("hours").downArray.get[Int]("i").contains(600))
    assert(valley.downField("hours").downArray.get[Int]("dp").contains(45))
  }

  // Grid over the Lugano–Zurich region, x west → east, y north → south, with a 10 m/s northward wind
  private val latitudes = (0 until 33).map(i => 47.5 - i * 0.05)
  private val longitudes = (0 until 15).map(i => 8.4 + i * 0.05)
  private val coordinates = longitudes.map(lon => latitudes.map(lat => Point(BigDecimal(lat), BigDecimal(lon))))

  private def forecast(mslpHPa: Double): Forecast = {
    val calm = Wind(MetersPerSecond(0), MetersPerSecond(0))
    Forecast(
      OffsetDateTime.parse("2026-11-15T12:00Z"), Meters(500), Meters(1000), calm, MetersPerSecond(0), 0, 0, None,
      SortedMap.empty, Pascals(mslpHPa * 100), Meters(0), Celsius(10), Celsius(0),
      Wind(MetersPerSecond(0), MetersPerSecond(10)), Meters(0), Meters(0),
      WattsPerSquareMeter(0), WattsPerSquareMeter(0), Grays(0), Grays(0), WattsPerSquareMeter(0), None,
      Winds(calm, calm, calm, calm, calm), 0, Meters(0)
    )
  }

  // MSLP is `south` hPa south of 46.7° N and `north` hPa elsewhere
  private def diagnose(south: Double, north: Double): FoehnValleys.Result =
    FoehnValleys.diagnose(
      IndexedSeq(coordinates.map(_.map(point => forecast(if (point.latitude < 46.7) south else north)))),
      coordinates
    )

  test("a south-to-north pressure difference keeps the index of south foehn lines") {
    val result = diagnose(south = 1010, north = 1004)
    val scores = result.valleyScoresByHour.head
    val south = scores.filter(_.direction == Direction.South)
    assert(south.exists(_.similarity > 0))
    assert(scores.forall(score => math.abs(score.pressureDifference - 6.0) < 1e-9))
    assert(south.forall(score => math.abs(score.index - score.similarity) < 1e-9))
    assert(scores.filter(_.direction == Direction.North).forall(_.index == 0))
    val cells = result.forecastsByHour.head.flatten.flatMap(_.valleyFoehn)
    assert(cells.exists(_.index > 0))
    assert(cells.filter(_.direction.contains(Direction.South)).forall(cell => math.abs(cell.index - cell.similarity) < 1e-9))
  }

  test("a north-to-south pressure difference zeroes the index of south foehn lines") {
    val result = diagnose(south = 1004, north = 1010)
    val south = result.valleyScoresByHour.head.filter(_.direction == Direction.South)
    assert(south.exists(_.similarity > 0))
    assert(south.forall(_.index == 0))
    assert(result.forecastsByHour.head.flatten.flatMap(_.valleyFoehn).filter(_.direction.contains(Direction.South)).forall(_.index == 0))
  }

  test("a weak pressure difference reduces the index") {
    val south = diagnose(south = 1007, north = 1003).valleyScoresByHour.head.filter(_.direction == Direction.South)
    assert(south.exists(score => score.index > 0 && score.index < score.similarity))
  }

  test("the index is zero when the pressure difference is unavailable") {
    val result = diagnose(south = 0, north = 0)
    val scores = result.valleyScoresByHour.head
    assert(scores.forall(_.pressureDifference.isNaN))
    assert(scores.forall(_.index == 0))
    assert(result.forecastsByHour.head.flatten.flatMap(_.valleyFoehn).forall(_.index == 0))
  }

}
