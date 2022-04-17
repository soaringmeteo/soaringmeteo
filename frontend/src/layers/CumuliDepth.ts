import { Forecast, ForecastPoint } from "../data/Forecast";
import { ColorScale, Color } from "../ColorScale";
import * as L from 'leaflet';

export const colorScale = new ColorScale([
  [0,    new Color(0xff, 0xff, 0xff, 0)],
  [50,   new Color(0xff, 0xff, 0xff, 0.2)],
  [400,  new Color(0xff, 0xff, 0xff, 0.5)],
  [800,  new Color(0xff, 0xff, 0x00, 0.5)],
  [1500, new Color(0xff, 0x00, 0x00, 0.5)]
]);



export class CumuliDepth {

  constructor(readonly forecast: Forecast) {}

  renderPoint(forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    if (forecastAtPoint !== undefined) {
      const color = colorScale.interpolate(forecastAtPoint.cumuliDepth);
      ctx.save();
      ctx.fillStyle = color.css();
      ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
      ctx.restore();
    }
  }

}
