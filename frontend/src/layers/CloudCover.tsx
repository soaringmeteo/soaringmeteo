import { Forecast, ForecastPoint } from "../data/Forecast";
import * as L from 'leaflet';
import { ColorScale, Color } from "../ColorScale";
import { Renderer } from "../map/CanvasLayer";
import { colorScaleEl, Layer } from "./Layer";

class CloudCover implements Renderer {

  constructor(readonly forecast: Forecast) {}

  renderPoint(forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    drawCloudCover(forecastAtPoint, topLeft, bottomRight, ctx, cloudCoverMaxOpacity);
  }

  summary(forecastPoint: ForecastPoint): Array<[string, string]> {
    return [
      ["Total cloud cover", `${ Math.round(forecastPoint.cloudCover * 100) }%`]
    ]
  }

}

const drawCloudCover = (forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D, maxOpacity: number): void => {
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

const cloudCoverColorScale = new ColorScale([
  [20,  new Color(0, 0, 0, 0.00 * cloudCoverMaxOpacity)],
  [40,  new Color(0, 0, 0, 0.25 * cloudCoverMaxOpacity)],
  [60,  new Color(0, 0, 0, 0.50 * cloudCoverMaxOpacity)],
  [80,  new Color(0, 0, 0, 0.75 * cloudCoverMaxOpacity)],
  [100, new Color(0, 0, 0, 1.00 * cloudCoverMaxOpacity)]
]);

export const cloudCoverLayer = new Layer(
  'Cloud Cover',
  'Cloud cover (all altitudes)',
  forecast => new CloudCover(forecast),
  colorScaleEl(cloudCoverColorScale, value => `${value}% `),
  <p>
    The cloud cover is a value between 0% and 100% that tells us how much of the
    sunlight will be blocked by the clouds. A low value means a blue sky, and a
    high value means a dark sky.
  </p>
);
