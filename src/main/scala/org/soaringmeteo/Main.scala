package org.soaringmeteo

object Main {

  def main(args: Array[String]): Unit = {
    MakeGFSJson.makeJsons(
      gfsLocFile         = os.Path(args(0)),
      gribsDir           = os.Path(args(1)),
      targetDir          = os.Path(args(2))
    )
  }

}
