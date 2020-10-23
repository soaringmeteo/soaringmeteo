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

  // File name used by the old soargfs
  def fileName(hoursOffset: Int, area: GfsDownloadBounds): String =
    f"GFS${area.id}-initDate${dateDirectory.stripPrefix("gfs.").drop(2)}-initTime${initTimeString}-forecastTime${hoursOffset}%03d.grib2"

}

object FindLatestRun {

  private val logger = LoggerFactory.getLogger(getClass)

  def now(): GfsRun = {
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
