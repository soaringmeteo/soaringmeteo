package org.soaringmeteo

import org.slf4j.Logger

import java.util.concurrent.atomic.AtomicInteger

/**
 * Logs the progression of a large amount of work being done.
 *
 * The class is thread-safe. Create an instance with the number of
 * tasks to complete. Every time a task is completed, call the method
 * `notifyCompleted()`. The reporter will report the progression by
 * increment of 10% (at least).
 *
 * @param total   Total number of chunks of work
 * @param message Base message to log
 * @param logger  Logger to report the progression to
 */
class WorkReporter(total: Int, message: String, logger: Logger) {

  val valuesToReport =
    if (total <= 10) (0 to total).toSet
    else {
      (0 to total).foldLeft((10, Set(0))) { case ((nextThreshold, values), x) =>
        if (x * 100 / total >= nextThreshold) (nextThreshold + 10, values + x)
        else (nextThreshold, values)
      }._2
    }

  private val completed = new AtomicInteger(0)

  def notifyCompleted(): Unit = {
    val x = completed.incrementAndGet()
    if (valuesToReport(x)) {
      logger.info(s"${message}: ${x * 100 / total}%")
    }
  }

}
