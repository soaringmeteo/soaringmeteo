package org.soaringmeteo.util

import org.slf4j.LoggerFactory
import verify.BasicTestSuite

object WorkReporterTestSuite extends BasicTestSuite {

  val dummyLogger = LoggerFactory.getLogger("test")

  test("various number of tasks to report") {

    def check(total: Int, expectedValuesToReport: Set[Int]): Unit = {
      val reporter = new WorkReporter(total, "foo", dummyLogger)
      assert(reporter.valuesToReport == expectedValuesToReport)
    }

    check(1, Set(0, 1))
    check(3, Set(0, 1, 2, 3))
    check(9, Set(0, 1, 2, 3, 4, 5, 6, 7, 8, 9))
    check(10, Set(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10))
    check(11, Set(0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11))
    check(15, Set(0, 2, 3, 5, 6, 8, 9, 11, 12, 14, 15))
    check(20, Set(0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20))
    check(100, Set(0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100))
  }

}
