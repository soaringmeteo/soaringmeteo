import { Forecast, ForecastPoint } from "../data/Forecast";
import * as L from 'leaflet';
import { Renderer } from "../map/CanvasLayer";
import { Layer } from "./Layer";

class None implements Renderer {

  constructor(readonly forecast: Forecast) {}

  renderPoint(forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
  }

  summary(forecastPoint: ForecastPoint) {
    return [];
  }

}

export const noLayer = new Layer(
  'None',
  'Map only',
  forecast => new None(forecast),
  <div />
);
