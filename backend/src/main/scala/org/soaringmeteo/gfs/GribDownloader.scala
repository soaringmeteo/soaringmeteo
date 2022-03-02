package org.soaringmeteo.gfs

import org.slf4j.LoggerFactory

import scala.concurrent.duration.{Duration, DurationInt}
import scala.util.Try
import scala.util.control.NonFatal

object GribDownloader {

  private val logger = LoggerFactory.getLogger(getClass)

  def download(
    targetDir: os.Path,
    gfsRun: in.ForecastRun,
    areaAndHour: AreaAndHour
  ): os.Path = {
    val url = gfsRun.gribUrl(areaAndHour)
    // In my experience, the `time` directory is created ~3 hours after the run initialization
    // But the grib files that we are interested are only available around 3 hours and 30 min after the run initialization
    val response = insist(maxAttempts = 10, delay = 3.minutes, url)
    val targetFile = targetDir / gfsRun.fileName(areaAndHour)
    os.write(targetFile, response.data.array)
    logger.debug(s"Downloaded $targetFile")
    targetFile
  }

  /**
   * Try to fetch `url` at most `maxAttempts` times, waiting `delay` between each attempt.
   */
  def insist(maxAttempts: Int, delay: Duration, url: String): requests.Response = concurrent.blocking {
    val errorOrSucessfulResponse =
      Try(requests.get(url, readTimeout = 1200000, check = false)) match {
        case Failure(exception) => Left(exception)
        case Success(response) =>
          if (response.statusCode == 200) Right(response)
          else Left(new Exception(s"Unexpected status code: ${response.statusCode} (${response.statusMessage})"))
      }
    errorOrSucessfulResponse match {
      case Right(response) => response
      case Left(error) =>
        if (maxAttempts <= 1 || !NonFatal(error)) {
          logger.error(s"Failed to fetch $url: $error")
          throw new RuntimeException(s"Unable to fetch $url.")
        } else {
          val remainingAttempts = maxAttempts - 1
          logger.debug(s"Failed to fetch $url: $error. Waiting ${delay.toSeconds} seconds… ($remainingAttempts remaining attempts)")
          Thread.sleep(delay.toMillis)
          insist(remainingAttempts, delay, url)
        }
    }
  }

}
