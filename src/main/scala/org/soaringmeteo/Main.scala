package org.soaringmeteo

object Main {

  def main(args: Array[String]): Unit = {
    val gfsLocFile = os.Path(args(0))
    val gribsDir   = os.Path(args(1))
    val jsonDir    = os.Path(args(2))

    DownloadGribFiles.run(gribsDir)
    MakeGFSJson.makeJsons(gfsLocFile, gribsDir, jsonDir)
    os.remove.all(gribsDir)
  }

}
