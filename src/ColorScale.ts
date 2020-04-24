export class Color {
  constructor(readonly red: number, readonly green: number, readonly blue: number) {}

  css(): string {
    return `#${this.red.toString(16).padStart(2, '0')}${this.green.toString(16).padStart(2, '0')}${this.blue.toString(16).padEnd(2, '0')}`
  }
}

export class ColorScale {
  readonly points: Array<[number, Color]>;
  constructor(unsortedPoints: Array<[number, Color]>) {
    this.points = unsortedPoints.sort(([x, c1], [y, c2]) => x - y)
  }

  interpolate(x: number): Color {
    const idx = this.points.findIndex(([k, _]) => x <= k)
    let i: number;
    if (idx === -1) i = this.points.length - 1
    else if (idx === 0) i = 1
    else i = idx

    const [x1, start] = this.points[i - 1];
    const [x2, end]   = this.points[i];
    const k = this.proportion(x, x1, x2);

    return new Color(
      start.red + Math.round(k * (end.red - start.red)),
      start.green + Math.round(k * (end.green - start.green)),
      start.blue + Math.round(k * (end.blue - start.blue))
    )
  }

  private proportion(x: number, low: number, high: number): number {
    return (this.clamp(x, low, high) - low) / (high - low)
  }

  private clamp(x: number, low: number, high: number): number {
    return Math.max(low, Math.min(x, high))
  }

}
