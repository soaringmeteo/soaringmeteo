name := "soaringmeteo"

scalaVersion := "2.13.10"

libraryDependencies ++= Seq(
  // grib2 manipulation
  "edu.ucar"             % "grib"            % "5.3.1",
  "ch.qos.logback"       % "logback-classic" % "1.2.3",
  // Image generation
  "org.locationtech.geotrellis" %% "geotrellis-raster" % "3.7.0",
//  "org.locationtech.geotrellis" %% "geotrellis-layer" % "3.7.0",
//  "org.locationtech.geotrellis" %% "geotrellis-spark" % "3.7.0",
//  "org.apache.spark" %% "spark-core" % "3.3.3",
  // HTTP requests
  "org.jsoup"            % "jsoup"           % "1.13.1",
  "com.lihaoyi"         %% "requests"        % "0.5.2",
  // Files manipulation
  "com.lihaoyi"         %% "os-lib"          % "0.6.3",
  // CSV
  "com.nrinaudo"        %% "kantan.csv"      % "0.6.0",
  // Quantities and refined types
  "org.typelevel"       %% "squants"         % "1.6.0",
  "eu.timepit"          %% "refined"         % "0.11.0",
  // Persistence
  "com.typesafe.slick"  %% "slick"           % "3.4.1",
  //"org.slf4j"           % "slf4j-nop"        % "1.7.26",
  "com.h2database"       % "h2"              % "2.2.224",
  // JSON
  "io.circe"            %% "circe-literal"   % "0.14.3",
  "io.circe"            %% "circe-jawn"      % "0.14.3" % Compile,
  "io.circe"            %% "circe-parser"    % "0.14.3",
  // Configuration
  "com.typesafe"         % "config"          % "1.4.1",
  // Command-line arguments parsing
  "com.monovore"        %% "decline"         % "2.2.0",
  // Testing
  "com.eed3si9n.verify" %% "verify"          % "0.2.0"  % Test
)

libraryDependencySchemes += "org.scala-lang.modules" %% "scala-xml" % "always"

scalacOptions += "-deprecation"

run / fork := true
javaOptions ++= Seq("-Xmx5g", "-Xms5g") // ++ org.apache.spark.launcher.JavaModuleOptions.defaultModuleOptions().split(" ") /* for JDK 17, see https://stackoverflow.com/questions/73465937/apache-spark-3-3-0-breaks-on-java-17-with-cannot-access-class-sun-nio-ch-direct */
Universal / javaOptions ++= javaOptions.value.map(opt => s"-J$opt")

testFrameworks += new TestFramework("verify.runner.Framework")

resolvers += "Unidata All" at "https://artifacts.unidata.ucar.edu/repository/unidata-all"

Global / onChangedBuildSource := ReloadOnSourceChanges

enablePlugins(GraalVMNativeImagePlugin)
Compile / mainClass := Some("org.soaringmeteo.gfs.Main")
graalVMNativeImageGraalVersion := Some("20.2.0")
graalVMNativeImageOptions ++= Seq(
  "--enable-https",
  "--verbose",
  "--no-fallback",
  "--static",
  "-H:+ReportExceptionStackTraces"
)
// To re-generate reflect-config.json file:
// javaOptions += "-agentlib:native-image-agent=config-output-dir=src/main/resources/META-INF/native-image/org.soaringmeteo/soaringmeteo"

TaskKey[Unit]("deploy") := {
  IO.move(
    (GraalVMNativeImage / packageBin).value,
    baseDirectory.value / ".." / ".." / "gfs" / "makeGFSJson"
  )
}

InputKey[Unit]("downloadGribAndMakeJson") := Def.inputTaskDyn {
  import sbt.complete.DefaultParsers._
  val maybeGfsRunInitTime = (Space ~> (literal("00") | literal("06") | literal("12") | literal("18"))).?.parsed
  val requiredArgs = List(
    "-r", // always reuse previous files in dev mode
    "target/grib",
    "target/forecast/data"
  )
  val args =
    maybeGfsRunInitTime.fold(requiredArgs)(t => s"-t ${t}" :: requiredArgs)
  (Compile / runMain).toTask(s" -Dconfig.file=dev.conf org.soaringmeteo.gfs.Main ${args.mkString(" ")}")
}.evaluated

TaskKey[Unit]("makeWrfJson") := {
  (Compile / runMain).toTask(" org.soaringmeteo.wrf.MakeWRFJson ../../Boran/soaringmeteo/wrf/wrf-loc.csv target/grib 2020-09-29_Init2020092700Z+54h.nc target/soarwrf").value
}
