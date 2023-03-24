import * as L from 'leaflet';
import { createEffect, createSignal } from 'solid-js';
import { ColorScale, Color } from "../ColorScale";
import { Grid } from '../data/Grid';
import { cloudCoverVariable } from '../data/OutputVariable';
import { Renderer } from "../map/CanvasLayer";
import { colorScaleEl, Layer } from "./Layer";

class CloudCoverRenderer implements Renderer {

  constructor(readonly grid: Grid<number>) {}

  renderPoint(lat: number, lng: number, averagingFactor: number, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    this.grid.mapViewPoint(lat, lng, averagingFactor, cloudCover => {
      drawCloudCover(cloudCover, topLeft, bottomRight, ctx, cloudCoverMaxOpacity);
    })
  }

  summary(lat: number, lng: number, averagingFactor: number): Array<[string, string]> | undefined {
    return this.grid.mapViewPoint(lat, lng, averagingFactor, cloudCover =>
      [
        ["Total cloud cover", `${ Math.round(cloudCover * 100) }%`]
      ]
    )
  }

}

const drawCloudCover = (cloudCover: number, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D, maxOpacity: number): void => {
  const width  = bottomRight.x - topLeft.x;
  const height = bottomRight.y - topLeft.y;
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

export const cloudCoverLayer = new Layer({
  key: 'cloud-cover',
  name: 'Cloud Cover',
  title: 'Cloud cover (all altitudes)',
  renderer: state => {
    const [get, set] = createSignal<Renderer>();
    createEffect(() => {
      state.forecastMetadata
        .fetchOutputVariableAtHourOffset(cloudCoverVariable, state.hourOffset)
        .then(grid => set(new CloudCoverRenderer(grid)))
    });
    return get
  },
  MapKey: () => colorScaleEl(cloudCoverColorScale, value => `${value}% `),
  Help: () => <p>
    The cloud cover is a value between 0% and 100% that tells us how much of the
    sunlight will be blocked by the clouds. A low value means a blue sky, and a
    high value means a dark sky.
  </p>
});
