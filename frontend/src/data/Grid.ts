import { Averager } from "./Averager";
import { modelResolution } from "./LocationForecasts";

export type GridData = {
  readonly [coordinates: string]: any
}

export abstract class Grid<A> {

  abstract at(latitude: number, longitude: number): A | undefined

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

  mapViewPoint<B>(latitude: number, longitude: number, averagingFactor: number, averager: Averager<A>, f: (value: A) => B): B | undefined {
    const point = this.viewPoint(latitude, longitude, averagingFactor, averager);
    if (point !== undefined) return f(point)
    else return undefined
  }
}


/**
 * A model grid containing data of type `A`
 */
export class SingleGrid<A> extends Grid<A> {
  constructor(readonly data: GridData, readonly parse: (json: any) => A) {
    super();
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

}

export class FourGrids<G1, G2, G3, G4, A> extends Grid<A> {
  constructor(readonly grid1: Grid<G1>, readonly grid2: Grid<G2>, readonly grid3: Grid<G3>, readonly grid4: Grid<G4>, readonly aggregate: (g1: G1, g2: G2, g3: G3, g4: G4) => A) {
    super();
  }

  at(latitude: number, longitude: number): A | undefined {
    const g1 = this.grid1.at(latitude, longitude);
    const g2 = this.grid2.at(latitude, longitude);
    const g3 = this.grid3.at(latitude, longitude);
    const g4 = this.grid4.at(latitude, longitude);
    if (g1 === undefined || g2 === undefined || g3 === undefined || g4 === undefined) {
      return undefined
    } else {
      return this.aggregate(g1, g2, g3, g4);
    }
  }

}
