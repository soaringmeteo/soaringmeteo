import { ColorScale, Color } from "../ColorScale";
import * as L from 'leaflet';
import { Renderer } from "../map/CanvasLayer";
import { Grid } from "../data/Grid";
import { colorScaleEl, Layer } from "./Layer";
import { createEffect, createSignal } from "solid-js";
import { Summary, summaryVariable } from "../data/OutputVariable";

export const colorScale = new ColorScale([
  [10, new Color(0x33, 0x33, 0x33, 1)],
  [20, new Color(0x99, 0x00, 0x99, 1)],
  [30, new Color(0xff, 0x00, 0x00, 1)],
  [40, new Color(0xff, 0x99, 0x00, 1)],
  [50, new Color(0xff, 0xcc, 0x00, 1)],
  [60, new Color(0xff, 0xff, 0x00, 1)],
  [70, new Color(0x66, 0xff, 0x00, 1)],
  [80, new Color(0x00, 0xff, 0xff, 1)],
  [90, new Color(0x99, 0xff, 0xff, 1)],
  [100, new Color(0xff, 0xff, 0xff, 1)]
]);

export const xcFlyingPotentialLayer = new Layer({

  key: 'xc-flying-potential',

  name: 'XC Flying Potential',

  title: 'XC flying potential',

  renderer: (state) => {
    const [get, set] = createSignal<Renderer>();
    createEffect(() => {
      state.forecastMetadata
        .fetchOutputVariableAtHourOffset(summaryVariable, state.hourOffset)
        .then(grid => set(new XCFlyingPotentialRenderer(grid)))
    });
    return get
  },

  MapKey: () => colorScaleEl(colorScale, value => `${value}% `),

  Help: () => <>
    <p>
      The XC flying potential index is a single indicator that takes into account
      the soaring layer depth, the sunshine, and the average wind speed within the
      boundary layer. Deep soaring layer, strong sunshine, and low wind speeds
      increase the value of this indicator.
    </p>
    <p>
      The color scale is shown on the bottom left of the screen. Click to a location
      on the map to get numerical data.
    </p>
  </>
  
});

class XCFlyingPotentialRenderer implements Renderer {

  constructor(readonly grid: Grid<Summary>) {}

  renderPoint(latitude: number, longitude: number, averagingFactor: number, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    this.grid.mapViewPoint(latitude, longitude, averagingFactor, data => {
      const color = colorScale.closest(data.xcPotential);
      ctx.save();
      ctx.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.25)`;
      ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
      ctx.restore();
    });
  }

  summary(latitude: number, longitude: number, averagingFactor: number): Array<[string, string]> | undefined {
    return this.grid.mapViewPoint(latitude, longitude, averagingFactor, data => [
      ["XC Flying Potential", `${data.xcPotential}%`],
      ["Soaring layer depth", `${data.soaringLayerDepth} m`],
      ["Thermal velocity",    `${data.thermalVelocity} m/s`],
      ["Total cloud cover",   `${Math.round(data.cloudCover * 100)}%`]
    ])
  }

}
