package org.soaringmeteo.build

import sbt.*
import sbt.Keys.*

import scala.sys.process.*

object MakeAssets {

  val fetchWrfData = inputKey[Unit]("Fetch input data from the latest WRF results on our server")
  val makeWrfAssets = inputKey[Unit]("Run the WRF pipeline locally on downloaded WRF data")
  val makeGfsAssets = inputKey[Unit]("Run the GFS pipeline locally")

  private val wrfDataDir = Def.setting {
    baseDirectory.value / "wrf-data"
  }

  // Parser for fetchWrfData: accepts an optional server instance
  private val fetchWrfDataParser: sbt.complete.Parser[Option[String]] = {
    import sbt.complete.DefaultParsers._
    (Space ~> Servers.instanceParser).?
  }

  // Parser for makeWrfAssets: accepts a WRF run directory name (e.g. "2026040506Z+24h")
  private val wrfRunParser = Def.setting[sbt.complete.Parser[Option[File]]] {
    import sbt.complete.DefaultParsers._
    val wrfDataDirValue = wrfDataDir.value
    val availableRuns: Seq[String] =
      if (wrfDataDirValue.isDirectory)
        wrfDataDirValue.listFiles().filter(_.isDirectory).map(_.getName).sorted.toSeq
      else Seq.empty
    if (availableRuns.nonEmpty)
      (Space ~> availableRuns.map(literal).reduce(_ | _).map(runName => wrfDataDirValue / runName)).?
    else
      success(None)
  }

  val makeAssetsSettings: Seq[Def.Setting[?]] = Seq(
    fetchWrfData := {
      val log = streams.value.log

      val maybeServer = fetchWrfDataParser.parsed
      val wrfDataDirValue = wrfDataDir.value

      val server = maybeServer.getOrElse(Servers.soarwrf3)
      val host = Servers.host(server)

      // 1. List available runs on the remote server
      log.info(s"Listing available runs on $host ...")
      val remotePath = "/home/soarwrf/domains/alps2km/wrfout/"
      val listing = Process(Seq("ssh", host, s"ls $remotePath")).!!.trim
      val lines = listing.split("\n").filter(_.nonEmpty)

      // Parse filenames to extract run identifiers (InitYYYYMMDDHHZ+Nh)
      // Example: wrfout_d02_2026-04-05_Init2026040506Z+24h.nc
      val initPattern = """Init(\d{10}Z\+\d+h)\.nc$""".r
      val runIds = lines.flatMap { name =>
        initPattern.findFirstMatchIn(name).map(_.group(1))
      }.distinct.sorted

      if (runIds.isEmpty) {
        sys.error(s"No WRF output files found on $host:$remotePath")
      }

      // 2. Display a menu and prompt the user
      println()
      println("Available WRF runs:")
      runIds.zipWithIndex.foreach { case (id, idx) =>
        println(s"  ${idx + 1}) $id")
      }
      println()
      print(s"Select a run [1-${runIds.length}]: ")
      val choice = scala.io.StdIn.readLine().trim.toInt
      require(choice >= 1 && choice <= runIds.length, s"Invalid choice: $choice")
      val selectedRun = runIds(choice - 1)
      log.info(s"Selected run: $selectedRun")

      // 3. Derive the target directory
      val wrfRunDir = wrfDataDirValue / selectedRun
      IO.createDirectory(wrfRunDir)

      // 4. Download all domain files matching the selected run
      val scpPattern = s"wrfout_d*_*_Init${selectedRun}.nc"
      log.info(s"Downloading files matching $scpPattern from $host ...")
      Process(
        Seq(
          "scp",
          s"$host:$remotePath$scpPattern",
          wrfRunDir.absolutePath + "/"
        )
      ).run(log).exitValue().ensuring(_ == 0, s"scp failed for run $selectedRun")

      log.info(s"Files downloaded to ${wrfRunDir.absolutePath}")
    },

    makeGfsAssets := Def.inputTaskDyn {
      import sbt.complete.DefaultParsers._
      val maybeGfsRunInitTime = (Space ~> (literal("00") | literal("06") | literal("12") | literal("18"))).?.parsed
      val requiredArgs = List(
        "-r", // always reuse previous files in dev mode
        "target/grib",
        (target.value / "forecast" / "data").absolutePath
      )
      val args =
        maybeGfsRunInitTime.fold(requiredArgs)(t => s"-t ${t}" :: requiredArgs)
      (LocalProject("gfs") / Compile / runMain).toTask(s" -Dconfig.file=dev.conf org.soaringmeteo.gfs.Main ${args.mkString(" ")}")
    }.evaluated,

    makeWrfAssets := Def.inputTaskDyn {
      val maybeSelectedWrfRun = wrfRunParser.parsed
      val wrfDataDirValue = wrfDataDir.value
      val outputDir = (target.value / "forecast" / "data").absolutePath

      val availableRuns = wrfDataDirValue.listFiles().filter(_.isDirectory)

      if (availableRuns.isEmpty) {
        throw new MessageOnlyException(s"No WRF runs found in ${wrfDataDirValue.absolutePath}. Please run 'fetchWrfData' first.")
      }

      val selectedWrfRun = maybeSelectedWrfRun.getOrElse(availableRuns.head)
      val runId = selectedWrfRun.getName

      // Discover .nc files
      val ncFiles = selectedWrfRun.listFiles().filter(_.getName.endsWith(".nc")).sorted
      if (ncFiles.isEmpty) throw new MessageOnlyException(s"No .nc files found in ${selectedWrfRun.getPath}")

      // Parse initTime and offset directly from the directory name (e.g. "2026040506Z+24h")
      val dirPattern = """(\d{4})(\d{2})(\d{2})(\d{2})Z\+(\d+)h""".r
      val (yyyy, mm, dd, hh, offsetStr) = runId match {
        case dirPattern(y, m, d, h, o) => (y, m, d, h, o)
        case _ => throw new MessageOnlyException(s"Directory name '$runId' does not match expected format YYYYMMDDHHz+Nh")
      }

      // initTime: "2026-04-05T06:00Z"
      val initTime = s"$yyyy-$mm-${dd}T$hh:00Z"
      // firstTimeStep: initTime + offset hours
      val offset = offsetStr.toInt
      val initDateTime = java.time.OffsetDateTime.parse(initTime)
      val firstTimeStep = initDateTime.plusHours(offset).toString

      val args = List(outputDir, initTime, firstTimeStep) ++ ncFiles.map(_.getAbsolutePath)

      (LocalProject("wrf") / Compile / runMain).toTask(s" org.soaringmeteo.wrf.Main ${args.mkString(" ")}")
    }.evaluated
  )

}
