import { Averager } from "./Averager";
import { modelResolution } from "./LocationForecasts";

export type GridData = {
  readonly [coordinates: string]: any
}

/**
 * A model grid containing data of type `A`
 */
export class Grid<A> {

  constructor(readonly data: GridData, readonly parse: (json: any) => A, readonly averager: Averager<A>) {
  }

  /**
   * @param   latitude  Must be hundredth of latitude (e.g. 4650 instead of 46.5)
   * @param   longitude Must be hundredth of longitude (e.g 725 instead of 7.25)
   * @returns The data at the given coordinates, or `undefined` if the coordinates
   *          are not covered by the grid.
   */
  at(latitude: number, longitude: number): A | undefined {
    const jsonData = this.data[`${longitude / modelResolution},${latitude / modelResolution}`];
    return jsonData === undefined ? undefined : this.parse(jsonData);
  }

  /**
   * @param averagingFactor 1, 2, 4, 8, etc.
   * @param latitude        Hundreth of degrees (e.g. 4675)
   * @param longitude       Hundreth of degrees (e.g. 7250)
   */
  viewPoint(latitude: number, longitude: number, averagingFactor: number, averager: Averager<A>): A | undefined {
    if (averagingFactor === 1) {
      const point = this.at(latitude, longitude);
      return point === undefined ? undefined : point
    }
    // According to the zoom level, users see the actual points, or
    // an average of several points.
    const points: Array<A> = [];
    let i = 0;
    while (i < averagingFactor) {
      let j = 0;
      while (j < averagingFactor) {
        const point = this.at(latitude + i * modelResolution, longitude + j * modelResolution);
        if (point !== undefined) {
          points.push(point);
        }
        j = j + 1;
      }
      i = i + 1;
    }
    if (points.length == 1) {
      return points[0]
    } else if (points.length > 1) {
      return averager.average(points)
    } else {
      return
    }
  }

  mapViewPoint<B>(latitude: number, longitude: number, averagingFactor: number, f: (value: A) => B): B | undefined {
    const point = this.viewPoint(latitude, longitude, averagingFactor, this.averager);
    if (point !== undefined) return f(point)
    else return undefined
  }
}
