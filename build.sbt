scalaVersion := "2.13.1"

libraryDependencies ++= Seq(
  // grib2 manipulation
  "edu.ucar"             % "grib"            % "5.3.1",
  "ch.qos.logback"       % "logback-classic" % "1.2.3",
  // HTTP requests
  "org.jsoup"            % "jsoup"           % "1.13.1",
  "com.lihaoyi"         %% "requests"        % "0.5.2",
  // Files manipulation
  "com.lihaoyi"         %% "os-lib"          % "0.6.3",
  // CSV
  "com.nrinaudo"        %% "kantan.csv"      % "0.6.0",
  // Quantities and refined types
  "org.typelevel"       %% "squants"         % "1.6.0",
  "eu.timepit"          %% "refined"         % "0.9.13",
  // JSON
  "io.circe"            %% "circe-literal"   % "0.13.0",
  "io.circe"            %% "circe-jawn"      % "0.13.0" % Compile,
  // Testing
  "com.eed3si9n.verify" %% "verify"          % "0.2.0"  % Test
)

run / fork := true

testFrameworks += new TestFramework("verify.runner.Framework")

resolvers += "Unidata Al" at "https://artifacts.unidata.ucar.edu/repository/unidata-all"

Global / onChangedBuildSource := ReloadOnSourceChanges

enablePlugins(GraalVMNativeImagePlugin)
Compile / mainClass := Some("org.soaringmeteo.Main")
graalVMNativeImageGraalVersion := Some("20.0.0")
graalVMNativeImageOptions ++= Seq("--no-fallback", "--allow-incomplete-classpath", "--no-server", "--initialize-at-build-time=scala.runtime.Statics$VM")

TaskKey[Unit]("deploy") := {
  IO.move(
    (GraalVMNativeImage / packageBin).value,
    baseDirectory.value / ".." / ".." / "gfs" / "makeGFSJson"
  )
}

TaskKey[Unit]("downloadGribAndMakeJson") := {
  (Compile / runMain).toTask(" org.soaringmeteo.Main /home/julien/workspace/dev/Boran/soaringmeteo/gfs/gfs-loc.csv /home/julien/workspace/dev/Boran/soaringmeteo/src/makeGFSJson/target/grib /home/julien/workspace/dev/Boran/soaringmeteo/src/makeGFSJson/target/forecast").value
}

TaskKey[Unit]("makeGfsJson") := {
  (Compile / runMain).toTask(" org.soaringmeteo.MakeGFSJson /home/julien/workspace/dev/Boran/soaringmeteo/gfs/gfs-loc.csv /home/julien/workspace/dev/Boran/soaringmeteo/src/makeGFSJson/target/grib /home/julien/workspace/dev/Boran/soaringmeteo/src/makeGFSJson/target/forecast").value
}

TaskKey[Unit]("downloadGribFiles") := {
//  val gribsDir = target.value / "grib"
//  (Compile / runMain).toTask(s" org.soaringmeteo.DownloadGribFiles $gribsDir").value
  (Compile / runMain).toTask(" org.soaringmeteo.DownloadGribFiles /home/julien/workspace/dev/Boran/soaringmeteo/src/makeGFSJson/target/grib").value
}
