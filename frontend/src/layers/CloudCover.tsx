import { Forecast, ForecastPoint } from "../data/Forecast";
import * as L from 'leaflet';
import { ColorScale, Color } from "../ColorScale";
import { DataSource } from "../CanvasLayer";
import { JSX } from "solid-js";

export class CloudCover implements DataSource {

  constructor(readonly forecast: Forecast) {}

  renderPoint(forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    drawCloudCover(forecastAtPoint, topLeft, bottomRight, ctx, cloudCoverMaxOpacity);
  }

  summary(forecastPoint: ForecastPoint): JSX.Element {
    return <table>
      <tbody>
        <tr><th>Total cloud cover: </th><td>{ Math.round(forecastPoint.cloudCover * 100) }%</td></tr>
      </tbody>
    </table>;
  }

}

export const drawCloudCover = (forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D, maxOpacity: number): void => {
  const width  = bottomRight.x - topLeft.x;
  const height = bottomRight.y - topLeft.y;
  const cloudCover = forecastAtPoint.cloudCover;
  const ch = 5;
  const hSpace = width / ch;
  const cv = 7;
  const vSpace = height / cv;
  Array.from({ length: ch }, (_, i) => {
    Array.from({ length: cv }, (_, j) => {
      const x = topLeft.x + hSpace * (i + 1 / 2);
      const y = topLeft.y + vSpace * (j + 1 / 2);
      ctx.fillStyle = cloudCoverColorScale.closest(cloudCover * 100).css();
      ctx.beginPath();
      ctx.arc(x, y, hSpace / 2, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

const cloudCoverMaxOpacity = 0.35;

export const cloudCoverColorScale = new ColorScale([
  [20,  new Color(0, 0, 0, 0.00 * cloudCoverMaxOpacity)],
  [40,  new Color(0, 0, 0, 0.25 * cloudCoverMaxOpacity)],
  [60,  new Color(0, 0, 0, 0.50 * cloudCoverMaxOpacity)],
  [80,  new Color(0, 0, 0, 0.75 * cloudCoverMaxOpacity)],
  [100, new Color(0, 0, 0, 1.00 * cloudCoverMaxOpacity)]
]);
