package org.soaringmeteo.wrf

import geotrellis.proj4.{LatLng, WebMercator}
import geotrellis.vector.Extent
import geotrellis.vector.reproject.Reproject
import org.slf4j.LoggerFactory
import org.soaringmeteo.grib.Grib
import org.soaringmeteo.out.VectorTiles
import org.soaringmeteo.{AirData, ConvectiveClouds, Forecast, Point, Thermals, Wind, Winds, XCFlyingPotential}
import squants.energy.Grays
import squants.motion.{MetersPerSecond, Pascals}
import squants.radio.WattsPerSquareMeter
import squants.space.{Length, Meters, Millimeters}
import squants.thermal.Celsius
import ucar.nc2.dt.GridCoordSystem
import ucar.nc2.time.CalendarPeriod.Field

import java.time.{OffsetDateTime, ZoneOffset}
import scala.collection.SortedMap
import scala.collection.immutable.ArraySeq
import scala.util.chaining.scalaUtilChainingOps

object NetCdf {

  case class Result(
    forecastsByHour: IndexedSeq[IndexedSeq[IndexedSeq[Forecast]]], // 3D matrix indexed by time, x-coordinate, and y-coordinate
    metadata: Metadata
  )

  case class Metadata(
    latestHourOffset: Int,
    width: Int,
    height: Int,
    raster: (BigDecimal, Extent),
    vectorTilesParameters: VectorTiles.Parameters
  )

  private val logger = LoggerFactory.getLogger(getClass)
  def read(file: os.Path): Result =
    Grib.bracket(file) { grib =>
      val forecasts = readAllTimeSteps(grib)
      logger.debug(s"Read $file")
      forecasts
    }

  private def readAllTimeSteps(grib: Grib): Result = {
    val pblh = grib.Feature("PBLH")
    val hgt = grib.Feature("HGT")
    val zFeature = grib.Feature("Z") // Grid elevation
    val zIndex = zFeature.newIndex()
    val u = grib.Feature("UMET")
    val v = grib.Feature("VMET")
//    val w = grib.Feature("W_MEAN") // Thermal velocity (note there is also the variable `W`, which gives the thermal velocity at various elevation levels (staggered))
    val temperature = grib.Feature("TC") // FIXME There is also a variable `PVS` that seems equivalent
    val temperature2 = grib.Feature("PVS")
    val dewPoint = grib.Feature("DP")
    val temperatureSurface = grib.Feature("T2C")
    val dewPointSurface = grib.Feature("DP2") // FIXME Double check correctness
    val uSurface = grib.Feature("U10")
    val vSurface = grib.Feature("V10")
    val mslp = grib.Feature("MSLP") // Mean sea level pressure
    val cloudFraction = grib.Feature("CLDFRA") // Cloud fraction
    val totalPrecipitation = grib.Feature("TOTPREC")
    val convectivePrecipitation = grib.Feature("PREC_ACC_C")
    val swdown = grib.Feature("SWDOWN") // Downward short-wave flux at ground surface
    val hfx = grib.Feature("HFX")
    // TODO We need more data to compute the thunderstorm risk as per Jean’s formula
    // Take the grid from a 4D non-staggered variable (e.g., UMET, VMET, CLDFRA, etc.)
    val grid4D = cloudFraction.grid
    val index4D = cloudFraction.newIndex()
    val index3D = hgt.newIndex()
    val coordinateSystem = grid4D.getCoordinateSystem
    val timeAxis = coordinateSystem.getTimeAxis1D
    val zAxis = coordinateSystem.getVerticalAxis
    val xAxis = coordinateSystem.getXHorizAxis
    val yAxis = coordinateSystem.getYHorizAxis
    val Array(timeSteps, zs, height, width) = grid4D.getShape
    // Assume cells are square in the projection
    val resolution = (xAxis.getMaxValue - xAxis.getMinValue) / (width - 1)

    val forecastsByHour =
      for {
        t <- 0 until timeSteps
      } yield {
        val time = timeAxis.getCalendarDate(t).pipe(date =>
          OffsetDateTime.of(
            date.getFieldValue(Field.Year),
            date.getFieldValue(Field.Month),
            date.getFieldValue(Field.Day),
            date.getFieldValue(Field.Hour),
            date.getFieldValue(Field.Minute),
            date.getFieldValue(Field.Second),
            0,
            ZoneOffset.UTC
          )
        )
        ArraySeq.tabulate(width) { x =>
          for (y <- (height - 1) to 0 by -1) yield {
            index3D.set(t, y, x)
            val elevation = Meters(hgt.read(index3D))
            // TODO Investigate why we cannot use the thermal velocity as computed by the WRF model
//            val thermalVelocity = MetersPerSecond(w.read(index3D))
            val boundaryLayerDepth = Meters(pblh.read(index3D))
            val downwardShortWaveFlux = WattsPerSquareMeter(swdown.read(index3D))
            val upwardHeatFlux = WattsPerSquareMeter(hfx.read(index3D))
            val thermalVelocity = Thermals.velocity(upwardHeatFlux, boundaryLayerDepth)
            val airData = {
              val airDataBuilder = SortedMap.newBuilder[Length, AirData]
              // Read the first elevation value (should be equal to the value read from the hgt variable)
              var previousElevation = Meters(zFeature.read(zIndex.set(t, 0, y, x)))
              var z = 0
              while (z < zs && previousElevation <= Meters(12_000)) {
                // The z axis is staggered on the Z feature (FIXME there might be a better way to achieve this)
                val nextElevation = Meters(zFeature.read(zIndex.set(t, z + 1, y, x)))
                val dataElevation = (previousElevation + nextElevation) / 2
                index4D.set(t, z, y, x)
                val wind = Wind(
                  MetersPerSecond(u.read(index4D)),
                  MetersPerSecond(v.read(index4D))
                )
                val temp = Celsius(temperature.read(index4D))
                val dp = Celsius(dewPoint.read(index4D))
                val cloudCover = (cloudFraction.read(index4D) * 100).round.intValue
                airDataBuilder += dataElevation -> AirData(wind, temp, dp, cloudCover)
                previousElevation = nextElevation
                z = z + 1
              }
              airDataBuilder.result()
            }

            val surfaceTemperature = Celsius(temperatureSurface.read(index3D))
            val surfaceDewPoint = Celsius(dewPointSurface.read(index3D))
            val maybeConvectiveClouds = ConvectiveClouds(surfaceTemperature, surfaceDewPoint, elevation, boundaryLayerDepth, airData)
            val soaringLayerDepth = Thermals.soaringLayerDepth(elevation, boundaryLayerDepth, maybeConvectiveClouds)
            val winds = Winds(airData, elevation, soaringLayerDepth)
            val surfaceWind = Wind(
              MetersPerSecond(uSurface.read(index3D)),
              MetersPerSecond(vSurface.read(index3D))
            )
//            val latLon = coordinateSystem.getLatLon(x, y) TODO Check grid coordinates
            val boundaryLayerWind = averageBoundaryLayerWind(airData, boundaryLayerDepth, elevation, surfaceWind)

            Forecast(
              time,
              elevation,
              boundaryLayerDepth,
              boundaryLayerWind,
              thermalVelocity,
              totalCloudCover(airData),
              0, // Convective cloud cover (TODO)
              maybeConvectiveClouds,
              airData,
              Pascals(mslp.read(index3D) * 100),
              Millimeters(0), // Snow depth (TODO)
              surfaceTemperature,
              surfaceDewPoint,
              surfaceWind,
              Millimeters(totalPrecipitation.read(index3D)),
              Millimeters(convectivePrecipitation.read(index3D)),
              WattsPerSquareMeter(0), // Latent heat net flux (TODO)
              upwardHeatFlux,
              Grays(0), // CAPE (TODO)
              Grays(0), // CIN (TODO)
              downwardShortWaveFlux,
              isothermZero = None,
              winds, // Winds
              XCFlyingPotential(thermalVelocity, soaringLayerDepth, boundaryLayerWind),
              soaringLayerDepth
            )
          }
        }
      }

    Result(
      forecastsByHour,
      Metadata(
        latestHourOffset = forecastsByHour.size - 1, // Assume 1 hour time-steps
        width,
        height,
        (resolution * 1000, rasterExtent(coordinateSystem)),
        vectorTilesParameters(coordinateSystem, resolution, width, height)
      )
    )
  }

  private def averageBoundaryLayerWind(airData: SortedMap[Length, AirData], boundaryLayerDepth: Length, locationElevation: Length, surfaceWind: Wind): Wind = {
    val boundaryLayerTop = locationElevation + boundaryLayerDepth
    val airDataWithinBoundaryLayer =
      airData
        .view
        .dropWhile { case (elevation, _) => elevation < locationElevation }
        .takeWhile { case (elevation, _) => elevation <= boundaryLayerTop }
        .map { case (_, data) => data.wind }
        .toIndexedSeq
    val windSum =
      airDataWithinBoundaryLayer.foldLeft(surfaceWind) { (acc, wind) =>
        Wind(acc.u + wind.u, acc.v + wind.v)
      }
    val n = airDataWithinBoundaryLayer.size + 1 // because of the surfaceWind item
    Wind(windSum.u / n, windSum.v / n)
  }

  private def totalCloudCover(airData: SortedMap[Length, AirData]): Int = {
    airData.view.map(_._2.cloudCover).max
  }

  private def vectorTilesParameters(coordinateSystem: GridCoordSystem, resolution: Double, width: Int, height: Int): VectorTiles.Parameters = {
    // Coordinates of all the points of the underlying WRF domain
    // Note that the grid of coordinates must match the structure of the returned grid of forecasts (axes in the same direction)
    val coordinates =
      for (x <- 0 until width) yield
        for (y <- (height - 1) to 0 by -1) yield {
          val latLon = coordinateSystem.getLatLon(x, y)
          Point(latLon.getLatitude, latLon.getLongitude)
        }
    val extent = {
      // To compute the extent, we re-project the coordinates into WebMercator
      val coordinatesWebMercator =
        for (columns <- coordinates) yield
          for (point <- columns) yield
            Reproject((point.longitude.doubleValue, point.latitude.doubleValue), LatLng, WebMercator)
      val firstColumn = coordinatesWebMercator.head.view
      val minX = firstColumn.map(_._1).min
      val lastColumn = coordinatesWebMercator.last.view
      val maxX = lastColumn.map(_._1).max
      val lastRow = coordinatesWebMercator.view.map(_.last)
      val minY = lastRow.map(_._2).min
      val firstRow = coordinatesWebMercator.view.map(_.head)
      val maxY = firstRow.map(_._2).max

      Extent(minX, minY, maxX, maxY).buffer(1000 /* meters */)
    }

    // Not very general, but works with 2km and 6km
    val maxViewZoom = if (resolution < 4) 12 else 10

    VectorTiles.Parameters(extent, maxViewZoom, width, height, coordinates)
  }

  def rasterExtent(coordinateSystem: GridCoordSystem): Extent = {
    val boundingBox = coordinateSystem.getBoundingBox
    Extent(
      boundingBox.getMinX * 1000,
      boundingBox.getMinY * 1000,
      boundingBox.getMaxX * 1000,
      boundingBox.getMaxY * 1000
    )
  }

}
