package org.soaringmeteo.gfs

object Main {

  def main(args: Array[String]): Unit = {
    val gribsDir   = os.Path(args(0))
    val jsonDir    = os.Path(args(1))

    DownloadGribFiles.run(gribsDir)
    MakeGFSJson.makeJsons(gribsDir, jsonDir)
    os.remove.all(gribsDir)
  }

}
