import { Forecast, ForecastPoint } from "../data/Forecast";
import * as L from 'leaflet';
import { Renderer } from "../map/CanvasLayer";
import { JSX } from "solid-js";

export class None implements Renderer {

  constructor(readonly forecast: Forecast) {}

  renderPoint(forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
  }

  summary(forecastPoint: ForecastPoint): JSX.Element {
    return <div></div>;
  }

}
