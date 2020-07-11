
type Point = [number /* latitade */, number /* longitude */]

export const scalePoint = (point: Point, center: Point, k: number): Point => {
  return [
    center[0] + (point[0] - center[0]) * k,
    center[1] + (point[1] - center[1]) * k
  ]
};

export const rotatePoint = (point: Point, center: Point, angle: number /* radians */): Point => {
  const deltaLon = point[1] - center[1];
  const deltaLat = point[0] - center[0];
  const length   = Math.sqrt(deltaLat * deltaLat + deltaLon * deltaLon);
  const theta    = Math.atan2(deltaLat, deltaLon);

  const theta2 = theta + angle;

  return [center[0] + Math.sin(theta2) * length, center[1] + Math.cos(theta2) * length]
};

export const rotateShape = (shape: Array<[number, number]>, center: [number, number], angle: number): Array<[number, number]> => {
  return shape.map(point => rotatePoint(point, center, angle))
};


/**
 * Canvas coordinates of an arrow representing the wind in a box
 * @param x         x-coordinate of the center of the box containing the arrow
 * @param y         y-coordinate of the center of the box containing the arrow
 * @param width     Width of the box containing the arrow
 * @param direction Wind direction (radians)
 * @param force     Wind force (km/h)
 */
export const windArrowCoordinates = (x: number, y: number, width: number, direction: number, force: number): Array<[number, number]> => {
  return Array.of<[number, number]>(
    [y - width / 3, x + width / 10],
    [y + width / 10, x + width / 10],
    [y + width / 10, x + width / 4],
    [y + width / 3, x],
    [y + width / 10, x - width / 4],
    [y + width / 10, x - width / 10],
    [y - width / 3, x - width / 10]
  ).map(point =>
      // The scale of the wind arrow is proportional to the wind force, and has a “normal” size for 18 km/h
      scalePoint(
      rotatePoint(point, [y, x], direction),
      [y, x],
      force / 18
    )
  )
}

export const drawWindArrow = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, color: string, u: number, v: number): void => {
  const windForce = Math.sqrt(u * u + v * v);
  const windDirection = Math.atan2(-u, -v);
  ctx.fillStyle = color;
  ctx.beginPath();
  windArrowCoordinates(x, y, width, windDirection, windForce).forEach(([y, x]) => {
    ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
}
