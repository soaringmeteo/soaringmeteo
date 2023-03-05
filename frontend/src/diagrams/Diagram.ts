import { cloudPattern, drawCumulusCloud } from "../shapes";

type Point = [/* x */ number, /* y */ number]

/**
 * A diagram within a canvas.
 * 
 * A diagram uses its own (local) coordinates system. The origin (0, 0)
 * is in the bottom left corner of the diagram. The horizontal axis
 * grows to the right, and the vertical axis grows upward.
 */
export class Diagram {

  /** x coordinate of the diagram origin in the target coordinates system */
  private readonly origX: number
  /** y coordinate of the diagram origin in the target coordinates system */
  private readonly origY: number

  /** 
   * @param topLeft Position of the top-left corner of the diagram, in the target
   *                coordinates system
   * @param height  Height of the diagram
   */
  constructor(readonly topLeft: Point, readonly height: number, readonly ctx: CanvasRenderingContext2D) {
    this.origY = this.topLeft[1] + this.height;
    this.origX = this.topLeft[0];
  }

  line(from: Point, to: Point, style: string, dash?: Array<number>, clip ?: boolean, lineWidth?: number): void {
    this.ctx.save();
    if (dash !== undefined) {
      this.ctx.setLineDash(dash);
    }
    if (clip === true) {
      this.ctx.beginPath();
      this.ctx.rect(this.origX, this.origY - this.height, this.ctx.canvas.width, this.height);
      this.ctx.clip();
    }
    if (lineWidth !== undefined) {
      this.ctx.lineWidth = lineWidth;
    }
    this.ctx.strokeStyle = style;
    this.ctx.beginPath();
    this.ctx.moveTo(this.projectX(from[0]), this.projectY(from[1]));
    this.ctx.lineTo(this.projectX(to[0]), this.projectY(to[1]));
    this.ctx.stroke();
    this.ctx.restore();
  }

  fillShape(points: Array<Point>, style: string): void {
    this.ctx.fillStyle = style;
    this.ctx.beginPath();
    points.forEach(([x, y]) => {
      this.ctx.lineTo(this.projectX(x), this.projectY(y));
    });
    this.ctx.closePath();
    this.ctx.fill();
  }

  text(content: string, location: Point, style: string, align?: CanvasTextAlign, baseline?: CanvasTextBaseline): void {
    this.ctx.save();
    this.ctx.fillStyle = style;
    if (align !== undefined) {
      this.ctx.textAlign = align;
    }
    if (baseline !== undefined) {
      this.ctx.textBaseline = baseline;
    }
    this.ctx.fillText(content, this.projectX(location[0]), this.projectY(location[1]));
    this.ctx.restore();
  }

  fillRect(from: Point, to: Point, style: string | CanvasPattern): void {
    this.ctx.save();
    this.ctx.fillStyle = style;
    this.ctx.beginPath();
    this.ctx.moveTo(this.projectX(from[0]), this.projectY(from[1]));
    this.ctx.lineTo(this.projectX(from[0]), this.projectY(to[1]));
    this.ctx.lineTo(this.projectX(to[0]),   this.projectY(to[1]));
    this.ctx.lineTo(this.projectX(to[0]),   this.projectY(from[1]));
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();
  }

  rect(from: Point, to: Point, style: string): void {
    this.ctx.save();
    this.ctx.strokeStyle = style;
    this.ctx.beginPath();
    this.ctx.moveTo(this.projectX(from[0]), this.projectY(from[1]));
    this.ctx.lineTo(this.projectX(from[0]), this.projectY(to[1]));
    this.ctx.lineTo(this.projectX(to[0]),   this.projectY(to[1]));
    this.ctx.lineTo(this.projectX(to[0]),   this.projectY(from[1]));
    this.ctx.closePath();
    this.ctx.stroke();
    this.ctx.restore();
  }

  cumulusCloud(fromBottomLeft: Point, toTopRight: Point, horizontalAlign: 'right' | 'center'): void {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(this.origX, this.origY - this.height, this.ctx.canvas.width, this.height);
    this.ctx.clip();
    const width = toTopRight[0] - fromBottomLeft[0];
    drawCumulusCloud(
      this.ctx,
      this.projectX(fromBottomLeft[0]) + width / 2,
      this.projectY(fromBottomLeft[1]),
      width,
      toTopRight[1] - fromBottomLeft[1],
      horizontalAlign
    );
    this.ctx.restore();
  }

  /** Projects the local horizontal coordinate x into the target coordinate space */
  projectX(x: number): number {
    return this.origX + x
  }

  /** Projects the local vertical coordinate y into the target coordinate space */
  projectY(y: number): number {
    return this.origY - y
  }

}

export class Scale {

  readonly ratio: number;

  constructor(readonly domain: [number, number], readonly range: [number, number], readonly clamp?: boolean) {
    this.ratio = (range[1] - range[0]) / (domain[1] - domain[0]);
  }

  apply(value: number): number {
    // HACK Works only if domain is increasing
    const normalized = this.clamp ? Math.max(this.domain[0], Math.min(this.domain[1], value)) : value;
    return this.range[0] + (normalized - this.domain[0]) * this.ratio
  }

}

export const nextValue = (currentValue: number, step: number): number =>
  (Math.floor(currentValue / step) + 1) * step;

export const previousValue = (currentValue: number, step: number): number =>
  (Math.ceil(currentValue / step) - 1) * step;

export const computeElevationLevels = (startLevel: number, step: number, maxLevel: number) => {
  const firstElevationLevel = nextValue(startLevel + 150, step);
  let nextElevationLevel = firstElevationLevel;
  const elevationLevels = [startLevel];
  while (nextElevationLevel < maxLevel) {
    elevationLevels.push(nextElevationLevel);
    nextElevationLevel = nextElevationLevel + step;
  }
  return elevationLevels
}

export const temperaturesRange =
  (dewPoints: Array<number>, temperatures: Array<number>): [number, number] => {
    const minTemperature =
      Math.floor(
        dewPoints.reduce((previousMin, dewPoint) => dewPoint < previousMin ? dewPoint : previousMin, Number.MAX_SAFE_INTEGER)
      );
    const maxTemperature =
      Math.ceil(
        temperatures.reduce((previousMax, temperature) => temperature > previousMax ? temperature : previousMax, Number.MIN_SAFE_INTEGER)
      );
    return [minTemperature, maxTemperature]
  }

export const skyStyle = '#85c1e9';
export const boundaryLayerStyle = 'mediumspringgreen';

export const meteogramColumnWidth = 33;

// Pre-compute cloud pattern
export const columnCloud = cloudPattern(meteogramColumnWidth / 3, 'rgba(255, 255, 255, 0.7)');
