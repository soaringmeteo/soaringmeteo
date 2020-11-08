package org.soaringmeteo.wrf

import org.soaringmeteo.grib.Grib
import squants.motion.{MetersPerSecond, Pascals}
import squants.radio.WattsPerSquareMeter
import squants.space.{Degrees, Meters}
import squants.thermal.Celsius

object WrfGrib {

  def process(grib: Grib, locations: Seq[WrfLocation]): Seq[(String, Seq[Forecast])] = {
    // Isobaric features
    val elevationFeature = grib.Feature("Z")
    val temperatureFeature = grib.Feature("TC")
    val dewPointFeature = grib.Feature("DP")
    val windSpeedFeature = grib.Feature("SPD")
    val windDirectionFeature = grib.Feature("WDIR")

    // Surface level features
    val boundaryLayerHeightFeature = grib.Feature("PBLH")
    val normalizedSunFeature = grib.Feature("NORMSUN")
    val downwardFluxFeature = grib.Feature("SWDOWN")
    val upwardFluxFeature = grib.Feature("HFX")
    val latentFluxFeature = grib.Feature("LH")
    val temperatureSurfaceFeature = grib.Feature("T2C")
    val dewPointSurfaceFeature = grib.Feature("DP2")
    val meanSeaLevelPressureFeature = grib.Feature("MSLP") // hPa
    val windSpeed10MetersFeature = grib.Feature("SPD10")
    val windDirection10MetersFeature = grib.Feature("WDIR10")
    val totalPrecipitationsFeature = grib.Feature("TOTPREC")

    val forecasts =
      for (location <- locations) yield {
        val locationForecasts =
          boundaryLayerHeightFeature.readSlice(location.x, location.y)
            .zip(normalizedSunFeature.readSlice(location.x, location.y))
            .zip(downwardFluxFeature.readSlice(location.x, location.y))
            .zip(upwardFluxFeature.readSlice(location.x, location.y))
            .zip(latentFluxFeature.readSlice(location.x, location.y))
            .zip(temperatureSurfaceFeature.readSlice(location.x, location.y))
            .zip(dewPointSurfaceFeature.readSlice(location.x, location.y))
            .zip(meanSeaLevelPressureFeature.readSlice(location.x, location.y))
            .zip(windSpeed10MetersFeature.readSlice(location.x, location.y))
            .zip(windDirection10MetersFeature.readSlice(location.x, location.y))
            .zip(totalPrecipitationsFeature.readSlice(location.x, location.y))
            .zip(elevationFeature.readSlices(location.x, location.y))
            .zip(temperatureFeature.readSlices(location.x, location.y))
            .zip(dewPointFeature.readSlices(location.x, location.y))
            .zip(windSpeedFeature.readSlices(location.x, location.y))
            .zip(windDirectionFeature.readSlices(location.x, location.y))
            .map {
              case (((((((((((((((blh, normSun), downSun), upSun), latentSun), temp), dewPoint), mslet), windSpeed), windDir), totalPrec), elevations), temps), dewPoints), windSpeeds), windDirs) =>

              Forecast(
                Meters(blh),
                normSun.round.intValue,
                WattsPerSquareMeter(downSun),
                WattsPerSquareMeter(upSun),
                WattsPerSquareMeter(latentSun),
                Celsius(temp),
                Celsius(dewPoint),
                Pascals(mslet * 100),
                MetersPerSecond(windSpeed),
                Degrees(windDir),
                (elevations.zip(temps).zip(dewPoints).zip(windSpeeds).zip(windDirs).map {
                  case ((((elevation, temp), dewPoint), windSpeed), windDir) =>
                    IsobaricFeatures(
                      Meters(elevation),
                      Celsius(temp),
                      Celsius(dewPoint),
                      MetersPerSecond(windSpeed),
                      Degrees(windDir)
                    )
                })
              )
            }

        location.id -> locationForecasts
      }

    forecasts
  }


}
