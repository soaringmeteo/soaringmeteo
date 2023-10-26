package org.soaringmeteo.gfs

package object out {

  /**
   * Version of the format of the forecast data we produce.
   * We need to bump this number everytime we introduce incompatibilities (e.g. adding a non-optional field).
   * Make sure to also bump the `formatVersion` in the frontend (see frontend/src/data/ForecastMetadata.ts).
   */
  val formatVersion = 3

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
