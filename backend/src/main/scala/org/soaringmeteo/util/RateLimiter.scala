package org.soaringmeteo.util

import squants.time.Frequency

import java.util.concurrent.{ConcurrentLinkedQueue, Executors, TimeUnit}
import scala.concurrent.{ExecutionContext, Future, Promise}
import scala.concurrent.duration.DurationInt

class RateLimiter(rateLimit: Frequency) {

  // Holds a list of requests for performing a task
  private val requests = new ConcurrentLinkedQueue[Promise[Unit]]()

  // Periodically poll the list of requests and allow the first one to be computed
  private val releaseTask: Runnable = () => {
    Option(requests.poll()).foreach(_.success(()))
  }
  private val period = 1.second / rateLimit.toHertz
  private val scheduler = Executors.newScheduledThreadPool(1, daemonicThreadFactory)
  scheduler.scheduleAtFixedRate(releaseTask, 0L, period.toMillis, TimeUnit.MILLISECONDS)

  /**
   * Submits a computation to evaluate on the provided Execution Context while
   * still applying the rate limit.
   */
  def submit[A](executionContext: ExecutionContext)(k: => A): Future[A] = {
    val promise = Promise[Unit]()
    requests.add(promise)
    promise.future.map(_ => k)(executionContext)
  }

}
