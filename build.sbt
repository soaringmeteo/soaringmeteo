scalaVersion := "2.13.1"

libraryDependencies ++= Seq(
  // grib2 manipulation
  "edu.ucar"             % "grib"            % "5.3.1",
  "ch.qos.logback"       % "logback-classic" % "1.2.3",
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

testFrameworks += new TestFramework("verify.runner.Framework")

resolvers += "Unidata Al" at "https://artifacts.unidata.ucar.edu/repository/unidata-all"

Global / onChangedBuildSource := ReloadOnSourceChanges

enablePlugins(GraalVMNativeImagePlugin)
graalVMNativeImageGraalVersion := Some("20.0.0")

TaskKey[Unit]("deploy") := {
  IO.move(
    (GraalVMNativeImage / packageBin).value,
    baseDirectory.value / ".." / ".." / "gfs" / "makeGFSJson"
  )
}

TaskKey[Unit]("runExample") := {
  (Compile / run).toTask(" /home/julien/workspace/dev/Boran/soaringmeteo/gfs/gfs-loc.csv /home/julien/workspace/dev/Boran/soaringmeteo/GFSDATA/200322/06/ /home/julien/workspace/dev/Boran/soaringmeteo/src/makeGFSJson/target/forecast/06").value
}
