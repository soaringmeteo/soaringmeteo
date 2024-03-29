package org.soaringmeteo.gfs

import org.slf4j.LoggerFactory
import org.soaringmeteo.util.{RateLimiter, daemonicThreadFactory}
import squants.time.RevolutionsPerMinute

import java.util.concurrent.Executors
import scala.concurrent.{ExecutionContext, Future}
import scala.concurrent.duration.{Duration, DurationInt}
import scala.util.{Failure, Success, Try}
import scala.util.control.NonFatal

/**
 * Utility to download from the NCEP servers.
 *
 * The NCEP servers apply a hit rate limit of 120 requests / second.
 * Additionally, I noticed that downloading several files in parallel
 * can be faster than downloading sequentially.
 *
 * So, we need a system performing as many parallel downloads as possible
 * while still staying below the hit rate limit.
 */
class GribDownloader {

  private val logger = LoggerFactory.getLogger(getClass)
  private val rateLimiter = new RateLimiter(RevolutionsPerMinute(Settings.downloadRateLimit))
  // We use a dedicated thread pool with a fixed number of threads to avoid trying to download
  // all the file at the same time. If one of them is not yet available, we want to wait for it
  // to be available before even trying to get the next ones. With the default ExecutionContext, we
  // would create as many threads as the number of files to download and we would try to resolve
  // them all (as long as we stay under the rate limit).
  private val severalThreads = ExecutionContext.fromExecutorService(Executors.newFixedThreadPool(3, daemonicThreadFactory))

  def scheduleDownload(
    targetFile: os.Path,
    gfsRun: in.ForecastRun,
    hourOffset: Int,
    subgrid: Subgrid
  ): Future[os.Path] =
    rateLimiter.submit(severalThreads) {
      logger.debug(s"Downloading GFS data at time $hourOffset and area ${subgrid.id}")
      download(targetFile, gfsRun, hourOffset, subgrid)
      targetFile
    }

  private def download(
    targetFile: os.Path,
    gfsRun: in.ForecastRun,
    hourOffset: Int,
    subgrid: Subgrid
  ): Unit = concurrent.blocking {
    val url = gfsRun.gribUrl(hourOffset, subgrid)
    // In my experience, the `time` directory is created ~3 hours after the run initialization
    // But the grib files that we are interested are only available around 3 hours and 30 min after the run initialization
    val response = insist(maxAttempts = 10, delay = 3.minutes, url)
    os.write(targetFile, response.data.array)
    logger.debug(s"Downloaded $targetFile")
  }

  /**
   * Try to fetch `url` at most `maxAttempts` times, waiting `delay` between each attempt.
   */
  def insist(maxAttempts: Int, delay: Duration, url: String): requests.Response = {
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
          logger.info(s"Failed to fetch $url: $error. Waiting ${delay.toSeconds} seconds… ($remainingAttempts remaining attempts)")
          Thread.sleep(delay.toMillis)
          insist(remainingAttempts, delay, url)
        }
    }
  }

}
