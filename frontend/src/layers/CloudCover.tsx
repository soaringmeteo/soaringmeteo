import * as L from 'leaflet';
import { createResource } from 'solid-js';
import { ColorScale, Color } from "../ColorScale";
import { ForecastMetadata } from '../data/ForecastMetadata';
import { cloudCoverVariable } from '../data/OutputVariable';
import { colorScaleEl, Layer, ReactiveComponents } from "./Layer";

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

export const cloudCoverLayer: Layer = {
  key: 'cloud-cover',
  name: 'Cloud Cover',
  title: 'Cloud cover (all altitudes)',
  reactiveComponents(props: {
    forecastMetadata: ForecastMetadata,
    hourOffset: number
  }): ReactiveComponents {

    const [cloudCoverGrid] =
      createResource(
        () => ({ forecastMetadata: props.forecastMetadata, hourOffset: props.hourOffset }),
        data => data.forecastMetadata.fetchOutputVariableAtHourOffset(cloudCoverVariable, data.hourOffset)
      );

    const renderer = () => {
      const grid = cloudCoverGrid();
      return {
        renderPoint(lat: number, lng: number, averagingFactor: number, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
          grid?.mapViewPoint(lat, lng, averagingFactor, cloudCover => {
            drawCloudCover(cloudCover, topLeft, bottomRight, ctx, cloudCoverMaxOpacity);
          })
        }
      }
    };

    const summarizer = () => {
      const grid = cloudCoverGrid();
      return {
        async summary(lat: number, lng: number): Promise<Array<[string, string]> | undefined> {
          return grid?.mapViewPoint(lat, lng, 1, cloudCover =>
            [
              ["Total cloud cover", `${ Math.round(cloudCover * 100) }%`]
            ]
          )
        }
      }
    }

    const mapKey = colorScaleEl(cloudCoverColorScale, value => `${value}% `);
    const help = <p>
      The cloud cover is a value between 0% and 100% that tells us how much of the
      sunlight will be blocked by the clouds. A low value means a blue sky, and a
      high value means a dark sky.
    </p>;

    return {
      renderer,
      summarizer,
      mapKey,
      help
    }
  }
};
