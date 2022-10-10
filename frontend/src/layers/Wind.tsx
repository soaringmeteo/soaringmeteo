import { drawWindArrow } from "../shapes";
import { Forecast, ForecastPoint } from "../data/Forecast";
import * as L from 'leaflet';
import { Renderer } from "../map/CanvasLayer";

export class Wind implements Renderer {

  constructor(readonly forecast: Forecast, readonly wind: ((forecast: ForecastPoint) => [number, number])) {}

  renderPoint(forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    const center = L.point((topLeft.x + bottomRight.x) / 2, (topLeft.y + bottomRight.y) / 2);
    const width  = bottomRight.x - topLeft.x;
    const [u, v] = this.wind(forecastAtPoint);
    drawWindArrow(ctx, center.x, center.y, width, windColor(0.30), u, v);
  }

  summary(forecastPoint: ForecastPoint): Array<[string, string]> {
    const [u, v] = this.wind(forecastPoint);
    const windSpeed = Math.sqrt(u * u + v * v);
    return [
      ["Wind speed", `${ Math.round(windSpeed) } km/h`]
    ]
  }

}

export const windColor = (opacity: number): string => `rgba(62, 0, 0, ${opacity})`;
