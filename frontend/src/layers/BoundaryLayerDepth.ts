import { Forecast, ForecastPoint } from "../Forecast";
import * as L from 'leaflet';
import { ColorScale, Color } from "../ColorScale";

export class BoundaryLayerDepth {

  constructor(readonly forecast: Forecast) {}

  renderPoint(forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    drawBoundaryLayerDepth(forecastAtPoint, topLeft, bottomRight, ctx);
  }
}

export const drawBoundaryLayerDepth = (forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D) => {
  const blh = forecastAtPoint.boundaryLayerHeight;
  const color = boundaryDepthColorScale.interpolate(blh);
  ctx.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.25)`;
  ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
}

export const boundaryDepthColorScale = new ColorScale([
  [0, new Color(0xff, 0x00, 0x00, 1)],
  [300, new Color(0xff, 0x7f, 0x00, 1)],
  [600, new Color(0x00, 0xff, 0x00, 1)],
  [1000, new Color(0x00, 0xff, 0xff, 1)],
  [1500, new Color(0xff, 0xff, 0xff, 1)]
]);
