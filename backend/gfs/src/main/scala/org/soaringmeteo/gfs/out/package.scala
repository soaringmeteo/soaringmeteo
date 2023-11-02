package org.soaringmeteo.gfs

import org.soaringmeteo.out.formatVersion

package object out {

  /** Directory to write the output of the GFS forecast and the
   * `forecast.json` metadata.
   */
  def versionedTargetPath(basePath: os.Path): os.Path =
    basePath / formatVersion.toString / "gfs"

  /** Directory to write the output of a GFS run */
  def runTargetPath(versionedTargetPath: os.Path, initDateString: String): os.Path =
    versionedTargetPath / initDateString

  /** Directory to write the output of a subgrid */
  def subgridTargetPath(runTargetPath: os.Path, subgrid: Subgrid): os.Path =
    runTargetPath / subgrid.id

}
