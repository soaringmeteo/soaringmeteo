import { Forecast, ForecastPoint } from "../data/Forecast";
import * as L from 'leaflet';
import { ColorScale, Color } from "../ColorScale";

export class BoundaryLayerDepth {

  constructor(readonly forecast: Forecast) {}

  renderPoint(forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    drawBoundaryLayerDepth(forecastAtPoint, topLeft, bottomRight, ctx);
  }
}

export const drawBoundaryLayerDepth = (forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D) => {
  const blh = forecastAtPoint.boundaryLayerDepth;
  const color = boundaryDepthColorScale.interpolate(blh);
  ctx.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.25)`;
  ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
}

export const boundaryDepthColorScale = new ColorScale([
  [0,    new Color(0x33, 0x33, 0x33, 1)],
  [200,  new Color(0x99, 0x00, 0x99, 1)],
  [400,  new Color(0xff, 0x00, 0x00, 1)],
  [600,  new Color(0xff, 0x99, 0x00, 1)],
  [800,  new Color(0xff, 0xcc, 0x00, 1)],
  [1000, new Color(0xff, 0xff, 0x00, 1)],
  [1200, new Color(0x66, 0xff, 0x00, 1)],
  [1400, new Color(0x00, 0xff, 0xff, 1)],
  [1600, new Color(0x99, 0xff, 0xff, 1)],
  [1800, new Color(0xff, 0xff, 0xff, 1)]
]);
