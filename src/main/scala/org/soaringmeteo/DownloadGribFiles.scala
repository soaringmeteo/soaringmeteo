package org.soaringmeteo

import org.jsoup.Jsoup
import io.circe.literal._
import org.slf4j.LoggerFactory

import scala.concurrent.{Await, Future}
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration.{Duration, DurationInt}
import scala.util.chaining._

object DownloadGribFiles {

  private val logger = LoggerFactory.getLogger(getClass)

  def main(args: Array[String]): Unit = {
    run(targetDir = os.Path(args(0)))
  }

  def run(targetDir: os.Path): Unit = {
    val rootUrl = "https://nomads.ncep.noaa.gov/pub/data/nccf/com/gfs/prod"
    val dateSegment =
      Jsoup.connect(rootUrl).get()
        .select("a[href^=gfs.]")
        .last()
        .attr("href").stripSuffix("/")
    val time =
      Jsoup.connect(s"$rootUrl/$dateSegment").get()
        .select("a")
        .last()
        .attr("href").stripSuffix("/")

    val date =
      dateSegment.stripPrefix("gfs.").pipe { s =>
        val year  = s.substring(0, 4)
        val month = s.substring(4, 6)
        val day   = s.substring(6, 8)
        s"$year-$month-$day"
      }

    logger.info(s"Found last run at ${date}T${time}Z")

    os.remove.all(targetDir)
    os.makeDir.all(targetDir)

    // Beware: I’ve been banned for using a parallelism level of 8
    inParallel(4, Settings.forecastHours) { t =>
      // For now, download the entire files. Eventually, we might want to use the GRIB Filter
      // system to select only the parameters and altitudes we are interested in.
      val file = f"gfs.t${time}z.pgrb2.0p50.f$t%03d"
      // In my experience, the `time` directory is created ~3 hours after the run initialization
      // But the grib files that we are interested are only available around 3 hours and 30 min after the run initialization
      val response = insist(maxAttempts = 10, delay = 3.minutes, s"$rootUrl/$dateSegment/$time/$file")
      os.write(targetDir / t.toString(), response.data.array)
      logger.debug(s"Downloaded grib file for hour $t")
    }
    os.write(targetDir / "forecast.json", json"""{ "date": $date, "time": $time }""".noSpaces)
  }

  /**
   * Try to fetch `url` at most `maxAttempts` times, waiting `delay` between each attempt.
   */
  def insist(maxAttempts: Int, delay: Duration, url: String): requests.Response = {
    val response = requests.get(url, readTimeout = 1200000, check = false)
    if (response.statusCode == 200) response
    else if (maxAttempts <= 1) {
      logger.error(s"Failed to fetch $url.")
      throw new RuntimeException
    } else {
      val remainingAttempts = maxAttempts - 1
      logger.debug(s"Failed to fetch $url. Waiting ${delay.toSeconds} seconds… ($remainingAttempts remaining attempts)")
      Thread.sleep(delay.toMillis)
      insist(remainingAttempts, delay, url)
    }
  }

  // Downloading is slow, but it seems that by starting several downloads in parallel
  // makes the whole process faster (up to 5x), although we always download from the
  // very same server... Maybe they limit the download rate per file, not per IP…?
  def inParallel[A, B](parallelism: Int, as: Seq[A])(f: A => B): Seq[B] =
    for {
      batch <- as.grouped(parallelism).toSeq
      b     <- Await.result(Future.traverse(batch)(a => Future(f(a))), 1.hour)
    } yield b

}
