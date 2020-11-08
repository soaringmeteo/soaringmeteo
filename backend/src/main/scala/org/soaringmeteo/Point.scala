package org.soaringmeteo

// Note: we use BigDecimal to get exact arithmetic (floating-point
// numbers only support approximate arithmetic)
case class Point(latitude: BigDecimal, longitude: BigDecimal)
