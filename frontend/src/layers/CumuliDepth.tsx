import { Forecast, ForecastPoint } from "../data/Forecast";
import { ColorScale, Color } from "../ColorScale";
import * as L from 'leaflet';
import { Renderer } from "../map/CanvasLayer";
import { JSX } from "solid-js";

export const colorScale = new ColorScale([
  [50,   new Color(0xff, 0xff, 0xff, 0)],
  [400,  new Color(0xff, 0xff, 0xff, 0.25)],
  [800,  new Color(0xff, 0xff, 0xff, 0.5)],
  [1500, new Color(0xff, 0xff, 0x00, 0.5)],
  [3000, new Color(0xff, 0x00, 0x00, 0.5)]
]);



export class CumuliDepth implements Renderer {

  constructor(readonly forecast: Forecast) {}

  renderPoint(forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    if (forecastAtPoint !== undefined) {
      const color = colorScale.closest(forecastAtPoint.cumuliDepth);
      ctx.save();
      ctx.fillStyle = color.css();
      ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
      ctx.restore();
    }
  }

  summary(forecastPoint: ForecastPoint): JSX.Element {
    return <table>
      <tbody>
        <tr><th>Cumuli depth: </th><td>{ forecastPoint.cumuliDepth }&nbsp;m</td></tr>
      </tbody>
    </table>;
  }

}
