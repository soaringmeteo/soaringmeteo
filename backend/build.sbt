import org.soaringmeteo.build.Dependencies

// Build settings
inThisBuild(Seq(
  scalaVersion := "2.13.12",
  scalacOptions += "-deprecation",
  libraryDependencySchemes += "org.scala-lang.modules" %% "scala-xml" % "always",
  testFrameworks += new TestFramework("verify.runner.Framework"),
  resolvers += "Unidata All" at "https://artifacts.unidata.ucar.edu/repository/unidata-all",
))

// Module with shared utilities
val common =
  project.in(file("common"))
    .settings(
      libraryDependencies ++= Seq(
        // Files manipulation
        "com.lihaoyi" %% "os-lib" % "0.9.1",
        // Command-line arguments processing
        Dependencies.decline,
        // Image generation
        Dependencies.geotrellisRaster,
        Dependencies.geotrellisVectorTile,
        // grib2 and NetCDF files manipulation
        "edu.ucar" % "grib" % "5.5.3",
        // Quantities
        Dependencies.squants,
        // Testing
        Dependencies.verify % Test,
      )
    )

// The GFS pipeline
val gfs =
  project.in(file("gfs"))
    .enablePlugins(JavaAppPackaging)
    .settings(
      name := "gfs",
      Universal / packageName := "soaringmeteo-gfs",
      run / fork := true,
      javaOptions ++= Seq("-Xmx6g", "-Xms5g"),
      Universal / javaOptions ++= javaOptions.value.map(opt => s"-J$opt"),
      Compile / mainClass := Some("org.soaringmeteo.gfs.Main"),
      maintainer := "equipe@soaringmeteo.org",
      libraryDependencies ++= Seq(
        // Logging
        Dependencies.logback,
        // HTTP requests
        "org.jsoup" % "jsoup" % "1.16.2",
        "com.lihaoyi" %% "requests" % "0.8.0",
        // Refined types
        "eu.timepit" %% "refined" % "0.11.0",
        // Persistence
        "com.typesafe.slick" %% "slick" % "3.4.1",
        "com.h2database" % "h2" % "2.2.224",
        // JSON
        Dependencies.circeParser,
        // Configuration
        Dependencies.config,
        // Testing
        Dependencies.verify % Test,
      ),
    )
    .dependsOn(common)

// The WRF pipeline
val wrf =
  project.in(file("wrf"))
    .enablePlugins(JavaAppPackaging)
    .settings(
      name := "wrf",
      Universal / packageName := "soaringmeteo-wrf",
      run / fork := true,
      javaOptions ++= Seq("-Xmx5g", "-Xms5g"),
      Universal / javaOptions ++= javaOptions.value.map(opt => s"-J$opt"),
      Compile / mainClass := Some("org.soaringmeteo.wrf.Main"),
      maintainer := "equipe@soaringmeteo.org",
      libraryDependencies ++= Seq(
        Dependencies.circeParser,
        Dependencies.geotrellisRaster,
        Dependencies.logback,
      )
    )
    .dependsOn(common)

// Root project for convenience
val soaringmeteo =
  project.in(file("."))
    .settings(
      name := "soaringmeteo"
    )
    .aggregate(common, gfs, wrf)

Global / onChangedBuildSource := ReloadOnSourceChanges

// Task that runs the gfs pipeline locally. It takes an optional parameter indicating the initialization
// time of the GFS run to download (00, 06, 12, or 18)
InputKey[Unit]("makeGfsAssets") := Def.inputTaskDyn {
  import sbt.complete.DefaultParsers._
  val maybeGfsRunInitTime = (Space ~> (literal("00") | literal("06") | literal("12") | literal("18"))).?.parsed
  val requiredArgs = List(
    "-r", // always reuse previous files in dev mode
    "target/grib",
    ((soaringmeteo / target).value / "forecast" / "data").absolutePath
  )
  val args =
    maybeGfsRunInitTime.fold(requiredArgs)(t => s"-t ${t}" :: requiredArgs)
  (gfs / Compile / runMain).toTask(s" -Dconfig.file=dev.conf org.soaringmeteo.gfs.Main ${args.mkString(" ")}")
}.evaluated

TaskKey[Unit]("makeWrfAssets") := Def.taskDyn {
  val inputFiles =
    Seq("d02", "d03", "d04", "d05")
      .map(domain => s"wrfout_${domain}_2023-10-30_Init2023102918Z+12h.nc")
  val args = List(
    ((soaringmeteo / target).value / "forecast" / "data").absolutePath,
    "2023-10-29T18:00Z",
    "2023-10-30T06:00Z"
  ) ++ inputFiles.map(file =>
    ((soaringmeteo / baseDirectory).value / file).absolutePath
  )
  (wrf / Compile / runMain).toTask(s" org.soaringmeteo.wrf.Main ${args.mkString(" ")}")
}.value
