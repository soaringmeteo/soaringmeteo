package org.soaringmeteo.gfs.in

import java.time.{LocalDate, LocalTime, OffsetDateTime, ZoneOffset}
import org.jsoup.Jsoup
import org.slf4j.LoggerFactory
import org.soaringmeteo.gfs.Subgrid
import org.soaringmeteo.gfs.Settings.gfsRootUrl

import scala.util.chaining._

/** Metadata about a run of GFS */
case class ForecastRun(
  dateDirectory: String, // "gfs.20200529"
  initDateTime: OffsetDateTime
) {

  private val initTimeString = f"${initDateTime.getHour}%02d" // "00", "06", "12", or "18"
  private val initDateString = dateDirectory.stripPrefix("gfs.").drop(2) // 220301 (for March 1st, 2022)

  /**
   * Name of the grib file we save on disk.
   *
   * @param hourOffset Number of hours since initialization time
   * @param subgrid    Area within the GFS domain
   */
  def fileName(hourOffset: Int, subgrid: Subgrid): String =
    f"GFS-${subgrid.id}-${hourOffset}%03d.grib2"

  /**
   * @param base Base path of the directory containing the grib files.
   * @return The path of the directory to store the grib files of this run.
   */
  def storagePath(base: os.Path): os.Path =
    base / initDateString / initTimeString

  /**
   * This URL has been constructed by going to https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl,
   * and then selecting a GFS run, and then selecting the levels as well as the variables we are
   * interested in.
   *
   * @param hourOffset Number of hours since initialization time
   */
  def gribUrl(hourOffset: Int, subgrid: Subgrid): String = {
    val file = f"gfs.t${initTimeString}z.pgrb2.0p25.f${hourOffset}%03d"
    val parameters =
      GfsGrib.gribFilterParameters.map(p => s"${p}=on") ++
        Seq(
          s"file=${file}",
          s"dir=%2F${dateDirectory}%2F${initTimeString}%2Fatmos",
          "subregion=",
          s"leftlon=${subgrid.leftLongitude}",
          s"rightlon=${subgrid.rightLongitude}",
          s"toplat=${subgrid.topLatitude}",
          s"bottomlat=${subgrid.bottomLatitude}"
        )
    s"$gfsRootUrl?${parameters.mkString("&")}"
  }

}

object ForecastRun {

  private val logger = LoggerFactory.getLogger(classOf[ForecastRun])

  /** Find the latest available GFS run
   *
   * @param maybeGfsRunInitTime Use a specific init time instead of trying to find the latest one.
   *                            Valid values are "00", "06", "12", and "18".
   */
  def findLatest(maybeGfsRunInitTime: Option[String]): ForecastRun = {
    val timeout = 5 * 60 * 1000 // 5 min
    val item =
      Jsoup.connect(gfsRootUrl).timeout(timeout).get()
        .select("a")
        .first()
    val date = item.text() // e.g. “gfs.20200529”
    // e.g. “06”
    val timeString = maybeGfsRunInitTime.getOrElse {
      Jsoup.connect(item.attr("href")).timeout(timeout).get()
        .select("a")
        .first()
        .text()
    }

    val forecastInitDate =
      date.stripPrefix("gfs.").pipe { s =>
        val year  = s.substring(0, 4).toInt
        val month = s.substring(4, 6).toInt
        val day   = s.substring(6, 8).toInt
        LocalDate.of(year, month, day)
      }

    logger.info(s"Found last run at ${forecastInitDate}T${timeString}Z")
    val forecastInitDateTime =
      OffsetDateTime.of(
        forecastInitDate,
        LocalTime.of(timeString.toInt, 0),
        ZoneOffset.UTC
      )

    ForecastRun(date, forecastInitDateTime)
  }

}
