package org.soaringmeteo.gfs

object Main {

  def main(args: Array[String]): Unit = {
    val csvLocationsFile = os.Path(args(0))
    val gribsDir         = os.Path(args(1))
    val jsonDir          = os.Path(args(2))

    val gfsRun = FindLatestRun.now()
    DownloadGribFiles.run(gribsDir, gfsRun)
    MakeGFSJson.makeJsons(csvLocationsFile, gribsDir, jsonDir, gfsRun)
    os.remove.all(gribsDir)
  }

}
