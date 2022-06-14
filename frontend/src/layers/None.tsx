import { Forecast, ForecastPoint } from "../data/Forecast";
import * as L from 'leaflet';
import { DataSource } from "../CanvasLayer";
import { JSX } from "solid-js";

export class None implements DataSource {

  constructor(readonly forecast: Forecast) {}

  renderPoint(forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
  }

  summary(forecastPoint: ForecastPoint): JSX.Element {
    return <div></div>;
  }

}
