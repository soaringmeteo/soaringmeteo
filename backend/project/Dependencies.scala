package org.soaringmeteo.build

import sbt.*

// Align the dependencies used in multiple projects by defining them once
object Dependencies {

  // JSON manipulation
  val circeVersion = "0.14.5"
  val circeParser = "io.circe" %% "circe-parser" % circeVersion

  // Configuration
  val config = "com.typesafe" % "config" % "1.4.2"

  // Command-line arguments parsing
  val decline = "com.monovore" %% "decline" % "2.4.1"

  // Raster images generation
  val geotrellisRaster = "org.locationtech.geotrellis" %% "geotrellis-raster" % "3.7.0"

  // Logging
  val logback = "ch.qos.logback" % "logback-classic" % "1.4.7"

  // Quantities and dimensions (velocity, temperature, length, etc.)
  val squants = "org.typelevel" %% "squants" % "1.8.3"
}
