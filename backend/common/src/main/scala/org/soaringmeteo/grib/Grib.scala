package org.soaringmeteo.grib

import org.soaringmeteo.Point
import ucar.ma2.{ArrayFloat, Index}
import ucar.nc2.dt.grid.{GeoGrid, GridDataset}

import scala.util.Using

/**
 * Convenient class for manipulating GRIB files.
 *
 * Uses the `ucar` library under the hood.
 *
 * TODO Handle errors.
 */
class Grib(dataset: GridDataset) {

  /**
   * @param grid Forecast data such as boundary layer height, wind force, etc.
   */
  case class Feature(grid: GeoGrid) {
    // Important: we pre-fetch all the data into memory, otherwise the execution is very slow due to file IOs
    private val data = grid.readDataSlice(/* t = */ -1, /* z = */ -1, /* y = */ -1, /* x = */ -1)

    def newIndex(): Index = data.getIndex()

    /** Assumes that the feature has 3 or 4 dimensions (where the time and elevation have only one possible value) */
    def read(location: Point): Double = {
      val (x, y) = getXYCoordinates(location)
      data match {
        case d3: ArrayFloat.D3 => d3.get(/* t = */ 0, y, x)
        case d4: ArrayFloat.D4 => d4.get(/* t = */ 0, /* z = */ 0, y, x)
      }
    }

    /**
     * Assumes that the feature has 4 dimensions:
     *
     *   - 0: time
     *   - 1: z (elevation)
     *   - 2: y
     *   - 3: x
     *
     * @return At each point in time, the values of this feature at each elevation
     */
    def readSlices(x: Int, y: Int): Seq[Seq[Double]] = {
      val Array(ts, zs, _, _) = data.getShape
      val index = data.getIndex
      (0 until ts).map { t =>
        (0 until zs).map { z =>
          data.getDouble(index.set(t, z, y, x))
        }
      }
    }

    /**
     * Assumes that the feature has 3 dimensions:
     *
     *   - 0: time
     *   - 1: y
     *   - 2: x
     *
     * @return At each point in time, the values of this feature
     */
    def readSlice(x: Int, y: Int): Seq[Double] = {
      val Array(ts, _, _) = data.getShape
      val index = data.getIndex
      (0 until ts).map { t =>
        data.getDouble(index.set(t, y, x))
      }
    }

    def read(index: Index): Double = {
      data.getDouble(index)
    }

    /** Assumes that the feature has 4 dimensions (where the time has only one possible value) */
    def read(location: Point, elevation: Double): Double = {
      val (x, y) = getXYCoordinates(location)
      val z = grid.getCoordinateSystem.getVerticalAxis.findCoordElement(elevation)
      data.asInstanceOf[ArrayFloat.D4].get(/* t = */ 0, z, y, x)
    }

    private def getXYCoordinates(location: Point): (Int, Int) = {
      val Array(x, y) =
        grid
          .getCoordinateSystem
          .findXYindexFromLatLon(location.latitude.doubleValue, location.longitude.doubleValue, null)
      (x, y)
    }

  }

  object Feature {

    def apply(name: String): Feature = maybe(name).get

    def maybe(name: String): Option[Feature] =
      Option(dataset.findGridByShortName(name)).map(Feature(_))

  }


}

object Grib {

  /**
   * Open a GRIB file, do something with it, and close it.
   */
  def bracket[A](file: os.Path)(f: Grib => A): A =
    Using.resource(GridDataset.open(file.toIO.getAbsolutePath)) { data =>
      f(new Grib(data))
    }

}
