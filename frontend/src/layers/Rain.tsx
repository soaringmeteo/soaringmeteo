import { Forecast, ForecastPoint } from "../data/Forecast";
import * as L from 'leaflet';
import { ColorScale, Color } from "../ColorScale";
import { DataSource } from "../CanvasLayer";
import { JSX } from "solid-js";

export class Rain implements DataSource {

  constructor(readonly forecast: Forecast) {}

  renderPoint(forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    drawRain(forecastAtPoint, topLeft, bottomRight, ctx);
  }

  summary(forecastPoint: ForecastPoint): JSX.Element {
    return <table>
      <tbody>
        <tr><th>Rainfall: </th><td>{ forecastPoint.rain }&nbsp;mm</td></tr>
      </tbody>
    </table>;
  }

}

const drawRain = (forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void => {
  const color = rainColorScale.closest(forecastAtPoint.rain);
  ctx.fillStyle = color.css();
  ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
}

export const rainColorScale = new ColorScale([
  [1,  new Color(0, 0, 255, 0)],
  [3,  new Color(0, 0, 255, 0.30)],
  [7,  new Color(0, 0, 255, 0.70)],
  [10, new Color(0, 0, 255, 1.00)],
]);
