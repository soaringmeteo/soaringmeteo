import { Forecast, ForecastPoint } from "../data/Forecast";
import * as L from 'leaflet';

export class None {

  constructor(readonly forecast: Forecast) {}

  renderPoint(forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
  }

}
