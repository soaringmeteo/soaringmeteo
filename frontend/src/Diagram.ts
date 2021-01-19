
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

  line(from: Point, to: Point, style: string, dash?: Array<number>, clip ?: boolean): void {
    this.ctx.save();
    if (dash !== undefined) {
      this.ctx.setLineDash(dash);
    }
    if (clip === true) {
      this.ctx.beginPath();
      this.ctx.rect(this.origX, this.origY - this.height, this.ctx.canvas.width, this.height);
      this.ctx.clip();
    }
    this.ctx.strokeStyle = style;
    this.ctx.lineWidth = 1;
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

  text(content: string, location: Point, style: string, align?: CanvasTextAlign): void {
    this.ctx.save();
    this.ctx.fillStyle = style;
    if (align !== undefined) {
      this.ctx.textAlign = align;
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
