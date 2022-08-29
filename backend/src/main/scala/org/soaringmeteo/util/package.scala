package org.soaringmeteo

import com.google.common.util.concurrent.ThreadFactoryBuilder

package object util {

  // Daemonic so that it won't prevent the application from shutting down
  val daemonicThreadFactory = new ThreadFactoryBuilder().setDaemon(true).build()

}
