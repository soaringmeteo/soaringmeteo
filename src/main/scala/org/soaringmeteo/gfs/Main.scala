package org.soaringmeteo.gfs

object Main {

  def main(args: Array[String]): Unit = {
    val csvLocationsFile = os.Path(args(0))
    val gribsDir         = os.Path(args(1))
    val jsonDir          = os.Path(args(2))

    val gfsRun = FindLatestRun.now()
    DownloadGribFiles.run(gribsDir, gfsRun)
    MakeGFSJson.makeJsons(csvLocationsFile, gribsDir, jsonDir, gfsRun)
    // Let’s keep the grib files because they are also used by the old soargfs
    // We should uncomment this line after we drop support for old soargfs
    // os.remove.all(gribsDir)
  }

}
