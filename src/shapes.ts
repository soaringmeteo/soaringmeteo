
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


