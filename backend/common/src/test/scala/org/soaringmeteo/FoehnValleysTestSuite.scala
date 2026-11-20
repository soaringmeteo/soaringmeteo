package org.soaringmeteo

import FoehnValleys.{Direction, NearestSample, ValleyScore, allSamples, chooseTemplate, pressureGatedIndex, valleys, windSimilarity}
import verify.BasicTestSuite

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

  test("wind similarity rewards alignment and penalises weak or opposite winds") {
    val solid = valleys.find(_.id == "S18").get.samples.head
    assert(math.abs(windSimilarity(solid, solid.east * 10, solid.north * 10) - 1.0) < 1e-9)
    assert(windSimilarity(solid, -solid.east * 10, -solid.north * 10) == 0.0)
    assert(windSimilarity(solid, 0, 0) == 0.0)
    assert(windSimilarity(solid, solid.east * 2, solid.north * 2) == 0.0)
  }

  test("dotted lines carry less confidence than solid lines") {
    val dotted = valleys.find(_.id == "S20").get.samples.head
    val solid = valleys.find(_.id == "S18").get.samples.head
    assert(dotted.confidence < solid.confidence)
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
    val valley = json.hcursor.downField("valleys").downArray
    assert(valley.get[String]("id").contains("S18"))
    assert(valley.downField("hours").downArray.get[Int]("s").contains(800))
    assert(valley.downField("hours").downArray.get[Int]("i").contains(600))
    assert(valley.downField("hours").downArray.get[Int]("dp").contains(45))
  }

}
