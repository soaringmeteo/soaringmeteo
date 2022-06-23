import { Forecast, ForecastPoint } from "../data/Forecast";
import * as L from 'leaflet';
import { ColorScale, Color } from "../ColorScale";
import { DataSource } from "../CanvasLayer";
import { JSX } from "solid-js";

export class ThermalVelocity implements DataSource {

  constructor(readonly forecast: Forecast) {}

  renderPoint(forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    const color = thermalVelocityColorScale.closest(forecastAtPoint.thermalVelocity);
    ctx.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.25)`;
    ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
  }

  summary(forecastPoint: ForecastPoint): JSX.Element {
    return <table>
      <tbody>
        <tr><th>Thermal velocity: </th><td>{ forecastPoint.thermalVelocity }&nbsp;m/s</td></tr>
      </tbody>
    </table>;
  }

}

export const thermalVelocityColorScale = new ColorScale([
  [0.25, new Color(0x33, 0x33, 0x33, 1)],
  [0.50, new Color(0x99, 0x00, 0x99, 1)],
  [0.75, new Color(0xff, 0x00, 0x00, 1)],
  [1.00, new Color(0xff, 0x99, 0x00, 1)],
  [1.25, new Color(0xff, 0xcc, 0x00, 1)],
  [1.50, new Color(0xff, 0xff, 0x00, 1)],
  [1.75, new Color(0x66, 0xff, 0x00, 1)],
  [2.00, new Color(0x00, 0xff, 0xff, 1)],
  [2.50, new Color(0x99, 0xff, 0xff, 1)],
  [3.00, new Color(0xff, 0xff, 0xff, 1)]
]);
