package org.soaringmeteo

import com.google.common.util.concurrent.ThreadFactoryBuilder

import java.util.concurrent.ThreadFactory

package object util {
  // Daemonic so that it won't prevent the application from shutting down
  val daemonicThreadFactory: ThreadFactory =
    new ThreadFactoryBuilder().setDaemon(true).build()

}
