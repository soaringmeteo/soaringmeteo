import { Forecast, ForecastPoint } from "../data/Forecast";
import * as L from 'leaflet';
import { ColorScale, Color } from "../ColorScale";
import { JSX } from "solid-js";
import { DataSource } from "../CanvasLayer";

export class BoundaryLayerDepth implements DataSource {

  constructor(readonly forecast: Forecast) {}

  renderPoint(forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    drawBoundaryLayerDepth(forecastAtPoint, topLeft, bottomRight, ctx);
  }

  summary(forecastAtPoint: ForecastPoint): JSX.Element {
    return <table>
      <tbody>
        <tr><th>Boundary layer depth: </th><td>{ forecastAtPoint.boundaryLayerDepth }&nbsp;m</td></tr>
      </tbody>
    </table>
  }

}

export const drawBoundaryLayerDepth = (forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D) => {
  const blh = forecastAtPoint.boundaryLayerDepth;
  const color = boundaryDepthColorScale.closest(blh);
  ctx.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.25)`;
  ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
}

export const boundaryDepthColorScale = new ColorScale([
  [250,  new Color(0x33, 0x33, 0x33, 1)],
  [500,  new Color(0x99, 0x00, 0x99, 1)],
  [750,  new Color(0xff, 0x00, 0x00, 1)],
  [1000, new Color(0xff, 0x99, 0x00, 1)],
  [1250, new Color(0xff, 0xcc, 0x00, 1)],
  [1500, new Color(0xff, 0xff, 0x00, 1)],
  [1750, new Color(0x66, 0xff, 0x00, 1)],
  [2000, new Color(0x00, 0xff, 0xff, 1)],
  [2250, new Color(0x99, 0xff, 0xff, 1)],
  [2500, new Color(0xff, 0xff, 0xff, 1)]
]);
