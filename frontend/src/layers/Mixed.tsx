import { drawWindArrow } from "../shapes";
import { Forecast, ForecastPoint } from "../data/Forecast";
import * as L from 'leaflet';
import { drawCloudCover } from "./CloudCover";
import { drawBoundaryLayerDepth } from "./BoundaryLayerDepth";
import { windColor } from "./Wind";
import { DataSource } from "../CanvasLayer";
import { JSX } from "solid-js";

export class Mixed implements DataSource {

  constructor(readonly forecast: Forecast) {}

  renderPoint(forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    const center = L.point((topLeft.x + bottomRight.x) / 2, (topLeft.y + bottomRight.y) / 2);
    const width  = bottomRight.x - topLeft.x;

    drawBoundaryLayerDepth(forecastAtPoint, topLeft, bottomRight, ctx);
    drawWindArrow(ctx, center.x, center.y, width, windColor(0.25), forecastAtPoint.uWind, forecastAtPoint.vWind);
    drawCloudCover(forecastAtPoint, topLeft, bottomRight, ctx, 0.35);
  }

  summary(forecastPoint: ForecastPoint): JSX.Element {
    const windSpeed = Math.sqrt(forecastPoint.uWind * forecastPoint.uWind + forecastPoint.vWind * forecastPoint.vWind);
    return <table>
      <tbody>
        <tr><th>Boundary layer depth: </th><td>{ forecastPoint.boundaryLayerDepth }&nbsp;m</td></tr>
        <tr><th>Boundary layer wind:</th><td>{ Math.round(windSpeed) }&nbsp;km/h</td></tr>
        <tr><th>Total cloud cover: </th><td>{ Math.round(forecastPoint.cloudCover * 100) }%</td></tr>
      </tbody>
    </table>;
  }

}
