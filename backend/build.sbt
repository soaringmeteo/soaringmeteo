import org.soaringmeteo.build.{Dependencies, MakeAssets}

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
    .settings(MakeAssets.makeAssetsSettings)
    .aggregate(common, gfs, wrf)

Global / onChangedBuildSource := ReloadOnSourceChanges
