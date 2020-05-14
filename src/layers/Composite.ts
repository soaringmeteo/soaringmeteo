import { scalePoint, rotatePoint } from "../shapes";
import { Forecast, modelResolution } from "../Forecast";
import * as L from 'leaflet';
import { ColorScale, Color } from "../ColorScale";

export class CompositeRenderer {

  constructor(readonly forecast: Forecast) {}

  renderPoint(map: L.Map, lat: number, lng: number, ctx: CanvasRenderingContext2D): void {
    const forecastAtPoint = this.forecast[`${lng},${lat}`];
    if (forecastAtPoint !== undefined) {
      const topLeft = map.latLngToContainerPoint([(lat + modelResolution / 2) / 100, (lng - modelResolution / 2) / 100]);
      const bottomRight = map.latLngToContainerPoint([(lat - modelResolution / 2) / 100, (lng + modelResolution / 2) / 100]);
      const center = map.latLngToContainerPoint([lat / 100, lng / 100]);
      const width = map.latLngToContainerPoint([lat / 100, (lng + modelResolution) / 100]).x - center.x;
      const height = map.latLngToContainerPoint([(lat - modelResolution) / 100, lng / 100]).y - center.y;
  
      // Boundary Layer Height
      const blh = forecastAtPoint.blh;
      const color = boundaryDepthColorScale.interpolate(blh);
      ctx.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.4)`;
      ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
  
      // Boundary Layer Wind
      const u = forecastAtPoint.u;
      const v = forecastAtPoint.v;
      const windForce = Math.sqrt(u * u + v * v);
      const windDirection = Math.atan2(-u, -v);
      ctx.fillStyle = `rgba(62, 0, 0, 0.35)`;
      ctx.beginPath();
      windArrowCoordinates(center.x, center.y, width, windDirection, windForce).forEach(([y, x]) => {
        ctx.lineTo(x, y);
      })
      ctx.closePath();
      ctx.fill();
  
      // Cloud cover
      const cloudCover = forecastAtPoint.c;
      const cloudCoverCoeff = cloudCover.e / 100;
      const ch = 5;
      const hSpace = width / ch;
      const cv = 7;
      const vSpace = height / cv;
      Array.from({ length: ch }, (_, i) => {
        Array.from({ length: cv }, (_, j) => {
          const x = topLeft.x + hSpace * (i + 1 / 2);
          const y = topLeft.y + vSpace * (j + 1 / 2);
          ctx.fillStyle = `rgba(60, 60, 60, ${cloudCoverCoeff / 2})`;
          ctx.beginPath();
          ctx.arc(x, y, hSpace / 2, 0, Math.PI * 2);
          ctx.fill();
        });
      });
    }
  
  }
}

export const boundaryDepthColorScale = new ColorScale([
  [0, new Color(0xff, 0x00, 0x00)],
  [300, new Color(0xff, 0x7f, 0x00)],
  [600, new Color(0x00, 0xff, 0x00)],
  [1000, new Color(0x00, 0xff, 0xff)],
  [1500, new Color(0xff, 0xff, 0xff)]
]);

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