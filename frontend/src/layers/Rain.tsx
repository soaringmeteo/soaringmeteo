import * as L from 'leaflet';
import { createEffect, createSignal } from 'solid-js';
import { ColorScale, Color } from "../ColorScale";
import { Grid } from '../data/Grid';
import { rainVariable } from '../data/OutputVariable';
import { Renderer } from "../map/CanvasLayer";
import { colorScaleEl, Layer } from './Layer';

class RainRenderer implements Renderer {

  constructor(readonly grid: Grid<number>) {}

  renderPoint(lat: number, lng: number, averagingFactor: number, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    this.grid
      .mapViewPoint(lat, lng, averagingFactor, rain => drawRain(rain, topLeft, bottomRight, ctx));
  }

  summary(lat: number, lng: number, averagingFactor: number): Array<[string, string]> | undefined {
    return this.grid.mapViewPoint(lat, lng, averagingFactor, rain =>
      [
        ["Rainfall", `${ rain } mm`]
      ]
    )
  }

}

const drawRain = (rain: number, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void => {
  const color = rainColorScale.closest(rain);
  ctx.fillStyle = color.css();
  ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
}

const rainColorScale = new ColorScale([
  [1,  new Color(0, 0, 255, 0)],
  [3,  new Color(0, 0, 255, 0.30)],
  [7,  new Color(0, 0, 255, 0.70)],
  [10, new Color(0, 0, 255, 1.00)],
]);

export const rainLayer = new Layer({
  key: 'rain',
  name: 'Rain',
  title: 'Total rain',
  renderer: state => {
    const [get, set] = createSignal<Renderer>();
    createEffect(() => {
      state.forecastMetadata
        .fetchOutputVariableAtHourOffset(rainVariable, state.hourOffset)
        .then(grid => set(new RainRenderer(grid)))
    });
    return get
  },
  MapKey: () => colorScaleEl(rainColorScale, value => `${value} mm `),
  Help: () => <p>The color scale is shown on the bottom left of the screen.</p>
});

