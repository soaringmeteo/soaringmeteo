package org.soaringmeteo.gfs

import java.time.{LocalDate, LocalTime, OffsetDateTime, ZoneOffset}

import org.jsoup.Jsoup
import org.slf4j.LoggerFactory
import org.soaringmeteo.gfs.Settings.gfsRootUrl

import scala.util.chaining._

case class GfsRun(
  initTimeString: String, // "00", "06", "12", or "18"
  dateDirectory: String, // "gfs.20200529"
  initDateTime: OffsetDateTime
) {

  /**
   * Name of the grib file we save on disk.
   *
   * Currently, we use the same file name as the old soargfs, for compatibility.
   *
   * @param hoursOffset Number of hours since initialization time
   * @param area        Downloaded area
   */
  def fileName(hoursOffset: Int, area: GfsDownloadBounds): String =
    f"GFS${area.id}-initDate${dateDirectory.stripPrefix("gfs.").drop(2)}-initTime${initTimeString}-forecastTime${hoursOffset}%03d.grib2"

  /**
   * This URL has been constructed by going to https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl,
   * and then selecting a GFS run, and then selecting the levels as well as the variables we are
   * interested in.
   *
   * @param area        Area to download
   * @param hoursOffset Number of hours since initialization time
   */
  def gribUrl(hoursOffset: Int, area: GfsDownloadBounds): String = {
    val file = f"gfs.t${initTimeString}z.pgrb2.0p25.f$hoursOffset%03d"
    s"$gfsRootUrl?file=${file}&dir=%2F${dateDirectory}%2F${initTimeString}&lev_mean_sea_level=on&lev_0C_isotherm=on&lev_10_m_above_ground=on&lev_200_mb=on&lev_2_m_above_ground=on&lev_300_mb=on&lev_400_mb=on&lev_450_mb=on&lev_500_mb=on&lev_550_mb=on&lev_600_mb=on&lev_650_mb=on&lev_700_mb=on&lev_750_mb=on&lev_800_mb=on&lev_850_mb=on&lev_900_mb=on&lev_950_mb=on&lev_boundary_layer_cloud_layer=on&lev_convective_cloud_layer=on&lev_entire_atmosphere=on&lev_high_cloud_layer=on&lev_low_cloud_layer=on&lev_middle_cloud_layer=on&lev_planetary_boundary_layer=on&lev_surface=on&var_ACPCP=on&var_APCP=on&var_CAPE=on&var_CIN=on&var_DSWRF=on&var_HGT=on&var_HPBL=on&var_LHTFL=on&var_MSLET=on&var_RH=on&var_SHTFL=on&var_TCDC=on&var_TMP=on&var_UGRD=on&var_VGRD=on&var_WEASD=on&leftlon=${area.leftLongitude}&rightlon=${area.rightLongitude}&toplat=${area.topLatitude}&bottomlat=${area.bottomLatitude}&subregion="
  }

}

object GfsRun {

  private val logger = LoggerFactory.getLogger(getClass)

  def findLatest(): GfsRun = {
    val item =
      Jsoup.connect(gfsRootUrl).timeout(120000).get()
        .select("a")
        .first()
    val date = item.text() // e.g. “gfs.20200529”
    // e.g. “06”
    val timeString =
      Jsoup.connect(item.attr("href")).timeout(120000).get()
        .select("a")
        .first()
        .text()

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

    GfsRun(timeString, date, forecastInitDateTime)
  }

}
