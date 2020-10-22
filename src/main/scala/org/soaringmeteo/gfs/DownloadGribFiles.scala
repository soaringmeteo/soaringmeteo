package org.soaringmeteo.gfs

import org.slf4j.LoggerFactory

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration.{Duration, DurationInt}
import scala.concurrent.{Await, Future}
import scala.util.Try

object DownloadGribFiles {

  private val logger = LoggerFactory.getLogger(getClass)

  def main(args: Array[String]): Unit = {
    run(
      targetDir = os.Path(args(0)),
      gfsRun = FindLatestRun.now()
    )
  }

  def run(targetDir: os.Path, gfsRun: GfsRun): Unit = {
    os.remove.all(targetDir)
    os.makeDir.all(targetDir)

    val allForecasts =
      for {
        area <- Settings.gfsDownloadAreas
        t    <- Settings.forecastHours
      } yield (area, t)

    // Beware: I’ve been banned for using a parallelism level of 8
    inParallel(4, allForecasts) { case (area, t) =>
      val url = gfsRun.gribUrl(area, t)
      // In my experience, the `time` directory is created ~3 hours after the run initialization
      // But the grib files that we are interested are only available around 3 hours and 30 min after the run initialization
      val response = insist(maxAttempts = 10, delay = 3.minutes, url)
      val targetFile = gfsRun.fileName(t, area)
      os.write(targetDir / targetFile, response.data.array)
      logger.debug(s"Downloaded $targetFile")
    }
    val metadata = ForecastMetadata(gfsRun.initDateTime, Settings.forecastHours.last)
    os.write(
      targetDir / "forecast.json",
      ForecastMetadata.jsonCodec(metadata).noSpaces
    )
  }

  /**
   * Try to fetch `url` at most `maxAttempts` times, waiting `delay` between each attempt.
   */
  def insist(maxAttempts: Int, delay: Duration, url: String): requests.Response = concurrent.blocking {
    val errorOrSucessfulResponse =
      Try(requests.get(url, readTimeout = 1200000, check = false))
        .toEither
        .filterOrElse(_.statusCode == 200, new Exception("Unexpected status code"))
    errorOrSucessfulResponse match {
      case Right(response) => response
      case Left(error) =>
        if (maxAttempts <= 1) {
          logger.error(s"Failed to fetch $url.", error)
          throw new RuntimeException(s"Unable to fetch $url.")
        } else {
          val remainingAttempts = maxAttempts - 1
          logger.debug(s"Failed to fetch $url. Waiting ${delay.toSeconds} seconds… ($remainingAttempts remaining attempts)", error)
          Thread.sleep(delay.toMillis)
          insist(remainingAttempts, delay, url)
        }
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
