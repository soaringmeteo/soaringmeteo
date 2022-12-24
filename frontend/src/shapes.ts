
type Point = [number /* x */, number /* y */]
type Line = [Point, Point]

const scalePoint = (point: Point, center: Point, k: number): Point => {
  return [
    center[0] + (point[0] - center[0]) * k,
    center[1] + (point[1] - center[1]) * k
  ]
};

/**
 * @param angle clockwise, in radians
 */
const rotatePoint = (point: Point, center: Point, angle: number): Point => {
  const deltaX = point[0] - center[0];
  const deltaY = point[1] - center[1];
  const length   = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const theta    = Math.atan2(deltaX, deltaY);

  const theta2 = theta + angle;

  return [center[0] + Math.cos(theta2) * length, center[1] + Math.sin(theta2) * length]
};

export const rotateShape = (shape: Array<[number, number]>, center: [number, number], angle: number): Array<[number, number]> => {
  return shape.map(point => rotatePoint(point, center, angle))
};

/**
 * Canvas coordinates of an arrow representing the wind.
 * 
 * The number of barbs of the arrow depends on the wind speed and offers a
 * resolution of 2.5 km/h. Between 0 and 2.5 km/h, the arrow has a small
 * barb on one side (e.g. ⇀). For each additional 2.5 km/h, we add more barbs,
 * or increase their length.
 * 
 * @param x         x-coordinate of the center of the arrow
 * @param y         y-coordinate of the center of the arrow
 * @param width     Width of the arrow bounding box
 * @param direction Wind direction in radians
 * @param speed     Wind speed in km/h
 */
const windArrowLines = (x: number, y: number, width: number, direction: number, speed: number): Array<Line> => {
  const resolution = 2.5 /* km/h */
  const entireBarbsSpeed = resolution * 4; // An entire barb is made of an upward barb and a downward barb, both at full scale
  const axis: Line = [[x - width / 2, y], [x + width / 2, y]];
  const barbsNumber = Math.floor((speed + entireBarbsSpeed) / entireBarbsSpeed);
  const barbLength = width / 3;
  const barbLines = (remainingSpeed: number, currentX: number): Array<Line> => {
    const upwardBarbScale = (remainingSpeed > resolution * 2) ? 1 : 0.5;
    const upwardBarbLines: Array<Line> = [
      [[currentX, y],
      [currentX - barbLength * upwardBarbScale, y - barbLength * upwardBarbScale]]
    ];
    const downwardBarbScale = (remainingSpeed > resolution * 3) ? 1 : 0.5;
    const downwardBarbLines: Array<Line> =
      (remainingSpeed > resolution) ?
        [
          [[currentX, y],
          [currentX - barbLength * downwardBarbScale, y + barbLength * downwardBarbScale]]
        ] :
        [];
    const lines: Array<Line> = upwardBarbLines.concat(downwardBarbLines);
    if (remainingSpeed > entireBarbsSpeed) {
      return lines.concat(barbLines(remainingSpeed - entireBarbsSpeed, currentX - (width / barbsNumber)));
    } else {
      return lines
    }
  }
  return [axis].concat(barbLines(speed, x + width / 2))
    .map(([p1, p2]) => [rotatePoint(p1, [x, y], direction), rotatePoint(p2, [x, y], direction)]);
}

export const lightningShape = (x: number, y: number, width: number): Array<Point> => {
  return [
    [x + width / 4, y + width / 2],
    [x - width / 6, y + width / 6],
    [x + width / 5, y - width / 6],
    [x - width / 8, y - width / 2],
    [x + width / 9, y - width / 6],
    [x - width / 3, y + width / 6],
    [x,             y + width / 2],
  ]
};

export const drawWindArrow = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, color: string, u: number, v: number, showNumericValues: boolean): void => {
  const windForce = Math.sqrt(u * u + v * v);
  const windDirection = -Math.atan2(u, -v);
  if (showNumericValues) {
    drawWindArrowAndNumericalValue(ctx, x, y, width, color, windForce, windDirection);
  } else {
    drawWindBarbell(ctx, x, y, width - 4, color, windForce, windDirection);
  }
}

const drawWindBarbell = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, color: string, windForce: number, windDirection: number): void => {
  ctx.save();
  ctx.lineWidth = Math.ceil(width / 20);
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.beginPath();
  windArrowLines(x, y, width, windDirection, windForce).forEach(([[x1, y1], [x2, y2]]) => {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  });
  ctx.stroke();
  ctx.restore();
};

const basicWindArrowShape = (x: number, y: number, width: number, direction: number): Array<Line> => {
  const center: Point = [x, y];
  const tail: Point   = rotatePoint([x - width / 2, y], center, direction);
  const head: Point   = rotatePoint([x + width / 2, y], center, direction);
  const up: Point     = rotatePoint([x + width / 4, y - width / 4], center, direction);
  const down: Point   = rotatePoint([x + width / 4, y + width / 4], center, direction);
  return [
    [tail, head],
    [head, up],
    [head, down]
  ]
};

const drawWindArrowAndNumericalValue = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  width: number,
  color: string,
  windVelocity: number,
  windDirection: number
): void => {
  ctx.save();
  const maxWindVelocity = 25; /* km/h */
  const boundedWindVelocity = Math.min(windVelocity, maxWindVelocity);
  const length = 8 + boundedWindVelocity * width / (3 * maxWindVelocity);
  const x = centerX - width / 4;
  const y = centerY;
  const segments = basicWindArrowShape(x, y, length, windDirection);
  ctx.lineWidth = Math.ceil(windVelocity / 15);
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.beginPath();
  segments.forEach(([[x1, y1], [x2, y2]]) => {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  })
  ctx.stroke();
  const textX = centerX + width / 4;
  const textY = centerY;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.round(windVelocity)}`, textX, textY);
  ctx.restore();
};

export const cloudPattern = (width: number, style: string): CanvasPattern => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = width;
  const ctx    = canvas.getContext('2d')
  if (ctx === null) {
    throw 'Unsupported execution environment'
  }
  ctx.ellipse(width / 2, width / 2, width / 2 - 1, width / 2 - 1, 0, 0, Math.PI * 2);
  ctx.fillStyle = style;
  ctx.fill();
  const pattern = ctx.createPattern(canvas, 'repeat');
  if (pattern === null) {
    throw 'Unsupported execution environment'
  }
  return pattern
};
