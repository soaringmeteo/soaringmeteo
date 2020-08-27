import { Forecast, modelResolution } from "../Forecast";

export class Clouds {

  constructor(readonly forecast: Forecast) {}

  renderPoint(map: L.Map, lat: number, lng: number, ctx: CanvasRenderingContext2D): void {
    const forecastAtPoint = this.forecast[`${lng},${lat}`];
    if (forecastAtPoint !== undefined) {
      const topLeft = map.latLngToContainerPoint([(lat + modelResolution / 2) / 100, (lng - modelResolution / 2) / 100]);
      const bottomRight = map.latLngToContainerPoint([(lat - modelResolution / 2) / 100, (lng + modelResolution / 2) / 100]);
      
      const low    = forecastAtPoint.c.l;
      const middle = forecastAtPoint.c.m;
      const high   = forecastAtPoint.c.h;

      // Same color palette as meteociel: red = low, green = middle, blue = high
      ctx.fillStyle = `rgba(${low * 255 / 100}, ${middle * 255 / 100}, ${high * 255 / 100}, 0.4)`;
      ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    }
  }

}
