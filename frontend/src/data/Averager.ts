
export type Averager<A> = {
  average(as: Array<A>): A
};

export const averager1D: Averager<number> = {
  average(xs: Array<number>): number {
    let total = 0;
    xs.forEach(x => total = total + x);
    return total / xs.length
  }
};

export const averager2D: Averager<[number, number]> = {
  average(points: Array<[number, number]>): [number, number] {
    let total0 = 0;
    let total1 = 0;
    points.forEach(point => {
      total0 = total0 + point[0];
      total1 = total1 + point[1];
    });
    return [total0 / points.length, total1 / points.length]
  }
};
