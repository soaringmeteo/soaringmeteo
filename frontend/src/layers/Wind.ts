import { drawWindArrow } from "../shapes";
import { Forecast, ForecastPoint } from "../data/Forecast";
import * as L from 'leaflet';

export class Wind {

  constructor(readonly forecast: Forecast) {}

  renderPoint(forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    const center = L.point((topLeft.x + bottomRight.x) / 2, (topLeft.y + bottomRight.y) / 2);
    const width  = bottomRight.x - topLeft.x;
    drawWindArrow(ctx, center.x, center.y, width, windColor(0.50), forecastAtPoint.uWind, forecastAtPoint.vWind);
  }
}

export const windColor = (opacity: number): string => `rgba(62, 0, 0, ${opacity})`;
