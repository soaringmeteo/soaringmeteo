import * as L from 'leaflet';
import { createEffect, createSignal } from 'solid-js';
import { ColorScale, Color } from "../ColorScale";
import { Grid } from '../data/Grid';
import { thermalVelocityVariable } from '../data/OutputVariable';
import { Renderer } from "../map/CanvasLayer";
import { colorScaleEl, Layer } from './Layer';

class ThermalVelocityRenderer implements Renderer {

  constructor(readonly grid: Grid<number>) {}

  renderPoint(latitude: number, longitude: number, averagingFactor: number, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    this.grid.mapViewPoint(latitude, longitude, averagingFactor, thermalVelocity => {
      const color = thermalVelocityColorScale.closest(thermalVelocity);
      ctx.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.25)`;
      ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    });
  }

  summary(latitude: number, longitude: number, averagingFactor: number): Array<[string, string]> | undefined {
    return this.grid.mapViewPoint(latitude, longitude, averagingFactor, thermalVelocity =>
      [
        ["Thermal velocity", `${ thermalVelocity } m/s`]
      ]
    );
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

export const thermalVelocityLayer = new Layer({
  key: 'thermal-velocity',
  name: 'Thermal Velocity',
  title: 'Thermal updraft velocity',
  renderer: state => {
    const [get, set] = createSignal<Renderer>();
    createEffect(() => {
      state.forecastMetadata
        .fetchOutputVariableAtHourOffset(thermalVelocityVariable, state.hourOffset)
        .then(grid => set(new ThermalVelocityRenderer(grid)))
    });
    return get
  },
  MapKey: () => colorScaleEl(thermalVelocityColorScale, value => `${value} m/s `),
  Help: () => <p>
    The thermal updraft velocity is estimated from the depth of the boundary
    layer and the sunshine. The color scale is shown on the bottom left of the
    screen.
  </p>
});
