import { Forecast, ForecastData } from "../Forecast";

export class Clouds {

  constructor(readonly forecast: Forecast) {}

  renderPoint(forecastAtPoint: ForecastData, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    if (forecastAtPoint !== undefined) {
      const low    = forecastAtPoint.c.l;
      const middle = forecastAtPoint.c.m;
      const high   = forecastAtPoint.c.h;

      // Same color palette as meteociel: red = low, green = middle, blue = high
      ctx.fillStyle = `rgba(${low * 255 / 100}, ${middle * 255 / 100}, ${high * 255 / 100}, 0.4)`;
      ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    }
  }

}
