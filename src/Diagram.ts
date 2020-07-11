
type Point = [/* x */ number, /* y */ number]

export class Diagram {

  private readonly origX: number
  private readonly origY: number

  constructor(readonly topLeft: Point, readonly height: number, readonly ctx: CanvasRenderingContext2D) {
    this.origY = this.topLeft[1] + this.height;
    this.origX = this.topLeft[0];
  }

  line(from: Point, to: Point, style: string): void {
    this.ctx.strokeStyle = style;
    this.ctx.beginPath();
    this.ctx.moveTo(this.projectX(from[0]), this.projectY(from[1]));
    this.ctx.lineTo(this.projectX(to[0]), this.projectY(to[1]));
    this.ctx.stroke();
  }

  text(content: string, location: Point, style: string): void {
    this.ctx.fillStyle = style;
    this.ctx.fillText(content, this.projectX(location[0]), this.projectY(location[1]));
  }

  fillRect(from: Point, to: Point, style: string): void {
    this.ctx.fillStyle = style;
    this.ctx.beginPath();
    this.ctx.moveTo(this.projectX(from[0]), this.projectY(from[1]));
    this.ctx.lineTo(this.projectX(from[0]), this.projectY(to[1]));
    this.ctx.lineTo(this.projectX(to[0]),   this.projectY(to[1]));
    this.ctx.lineTo(this.projectX(to[0]),   this.projectY(from[1]));
    this.ctx.closePath();
    this.ctx.fill();
  }

  projectX(x: number): number {
    return this.origX + x
  }

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
