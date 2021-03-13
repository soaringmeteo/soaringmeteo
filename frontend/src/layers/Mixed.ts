import { drawWindArrow } from "../shapes";
import { Forecast, ForecastPoint } from "../data/Forecast";
import * as L from 'leaflet';
import { drawCloudCover } from "./CloudCover";
import { drawBoundaryLayerDepth } from "./BoundaryLayerDepth";
import { windColor } from "./Wind";

export class Mixed {

  constructor(readonly forecast: Forecast) {}

  renderPoint(forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    const center = L.point((topLeft.x + bottomRight.x) / 2, (topLeft.y + bottomRight.y) / 2);
    const width  = bottomRight.x - topLeft.x;

    drawBoundaryLayerDepth(forecastAtPoint, topLeft, bottomRight, ctx);
    drawWindArrow(ctx, center.x, center.y, width, windColor(0.25), forecastAtPoint.uWind, forecastAtPoint.vWind);
    drawCloudCover(forecastAtPoint, topLeft, bottomRight, ctx, 0.35);
  }
}
