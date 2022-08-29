package org.soaringmeteo.util

import squants.time.Hertz
import verify.BasicTestSuite

import java.util.concurrent.atomic.AtomicInteger
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future

object RateLimiterSuite extends BasicTestSuite {

  val rateLimiter = new RateLimiter(Hertz(10))

  test("possibly flaky test") {
    val n = new AtomicInteger(0)
    Future.traverse(1 to 10) { _ =>
      rateLimiter.submit(global)(n.incrementAndGet())
    }
    Thread.sleep(500)
    assert(n.get() < 6)
    Thread.sleep(600)
    assert(n.get() == 10)
  }

}
