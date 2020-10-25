package org.soaringmeteo.gfs

object Main {

  def main(args: Array[String]): Unit = {
    val csvLocationsFile = os.Path(args(0))
    val gribsDir         = os.Path(args(1))
    val jsonDir          = os.Path(args(2))

    main(csvLocationsFile, gribsDir, jsonDir)
  }

  def main(csvLocationsFile: os.Path, gribsDir: os.Path, jsonDir: os.Path) = {
    val gfsRun = GfsRun.findLatest()
    val locationsByArea =
      Settings.gfsForecastLocations(csvLocationsFile)
        .groupBy { point =>
          Settings.gfsDownloadAreas
            .find(_.contains(point))
            .getOrElse(sys.error(s"${point} is not in the downloaded GFS areas"))
        }
    val forecastsByHour = DownloadAndRead(gribsDir, gfsRun, locationsByArea)
    JsonWriter.writeJsons(jsonDir, gfsRun, forecastsByHour, locationsByArea.values.flatten)
    // Let’s keep the grib files because they are also used by the old soargfs
    // We should uncomment this line after we drop support for old soargfs
    // os.remove.all(gribsDir)
  }

}
