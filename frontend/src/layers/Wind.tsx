import { drawWindArrow } from "../shapes";
import { Forecast, ForecastPoint } from "../data/Forecast";
import * as L from 'leaflet';
import { JSX } from "solid-js";
import { DataSource } from "../CanvasLayer";

export class Wind implements DataSource {

  constructor(readonly forecast: Forecast, readonly wind: ((forecast: ForecastPoint) => [number, number])) {}

  renderPoint(forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    const center = L.point((topLeft.x + bottomRight.x) / 2, (topLeft.y + bottomRight.y) / 2);
    const width  = bottomRight.x - topLeft.x;
    const [u, v] = this.wind(forecastAtPoint);
    drawWindArrow(ctx, center.x, center.y, width, windColor(0.50), u, v);
  }

  summary(forecastPoint: ForecastPoint): JSX.Element {
    const [u, v] = this.wind(forecastPoint);
    const windSpeed = Math.sqrt(u * u + v * v);
    return <table>
      <tbody>
        <tr><th>Wind speed:</th><td>{ Math.round(windSpeed) }&nbsp;km/h</td></tr>
      </tbody>
    </table>;
  }

}

export const windColor = (opacity: number): string => `rgba(62, 0, 0, ${opacity})`;
