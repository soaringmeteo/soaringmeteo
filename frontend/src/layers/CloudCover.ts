import { Forecast, ForecastPoint } from "../Forecast";
import * as L from 'leaflet';
import { ColorScale, Color } from "../ColorScale";

export class CloudCover {

  constructor(readonly forecast: Forecast) {}

  renderPoint(forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    drawCloudCover(forecastAtPoint, topLeft, bottomRight, ctx, cloudCoverMaxOpacity);
  }
}

export const drawCloudCover = (forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D, maxOpacity: number): void => {
  const width  = bottomRight.x - topLeft.x;
  const height = bottomRight.y - topLeft.y;
  const cloudCover = forecastAtPoint.cloudCover;
  const cloudCoverCoeff = cloudCover / 100;
  const ch = 5;
  const hSpace = width / ch;
  const cv = 7;
  const vSpace = height / cv;
  Array.from({ length: ch }, (_, i) => {
    Array.from({ length: cv }, (_, j) => {
      const x = topLeft.x + hSpace * (i + 1 / 2);
      const y = topLeft.y + vSpace * (j + 1 / 2);
      ctx.fillStyle = cloudCoverColor(cloudCoverCoeff, maxOpacity).css();
      ctx.beginPath();
      ctx.arc(x, y, hSpace / 2, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

const cloudCoverMaxOpacity = 0.35;

export const cloudCoverColor = (cloudCoverCoeff: number /* between 0 and 1 */, maxOpacity: number /* between 0 and 1 */): Color => {
  return new Color(0, 0, 0, cloudCoverCoeff * maxOpacity)
}

export const cloudCoverColorScale = new ColorScale([
  [0,   cloudCoverColor(0.00, cloudCoverMaxOpacity)],
  [25,  cloudCoverColor(0.25, cloudCoverMaxOpacity)],
  [50,  cloudCoverColor(0.50, cloudCoverMaxOpacity)],
  [75,  cloudCoverColor(0.75, cloudCoverMaxOpacity)],
  [100, cloudCoverColor(1.00, cloudCoverMaxOpacity)]
]);
