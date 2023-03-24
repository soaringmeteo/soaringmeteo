import { ColorScale, Color } from "../ColorScale";
import * as L from 'leaflet';
import { Renderer } from "../map/CanvasLayer";
import { colorScaleEl, Layer } from "./Layer";
import { Grid } from "../data/Grid";
import { createEffect, createSignal } from "solid-js";
import { cumulusDepthVariable } from "../data/OutputVariable";
import { averager1D } from "../data/Averager";

const cumuliDepthColorScale = new ColorScale([
  [50,   new Color(0xff, 0xff, 0xff, 0)],
  [400,  new Color(0xff, 0xff, 0xff, 0.25)],
  [800,  new Color(0xff, 0xff, 0xff, 0.5)],
  [1500, new Color(0xff, 0xff, 0x00, 0.5)],
  [3000, new Color(0xff, 0x00, 0x00, 0.5)]
]);

class CumuliDepthRenderer implements Renderer {

  constructor(readonly grid: Grid<number>) {}

  renderPoint(lat: number, lng: number, averagingFactor: number, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    this.grid.mapViewPoint(lat, lng, averagingFactor, averager1D, cumuliDepth => {
      const color = cumuliDepthColorScale.closest(cumuliDepth);
      ctx.save();
      ctx.fillStyle = color.css();
      ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
      ctx.restore();
    });
  }

  summary(lat: number, lng: number, averagingFactor: number): Array<[string, string]> | undefined {
    return this.grid.mapViewPoint(lat, lng, averagingFactor, averager1D, cumuliDepth =>
      [
        ["Cumuli depth", `${ cumuliDepth } m`]
      ]
    );
  }

}

export const cumuliDepthLayer = new Layer({
  key: 'cumuli-depth',
  name: 'Cumulus Clouds',
  title: 'Cumulus clouds depth',
  renderer: state => {
    const [get, set] = createSignal<Renderer>();
    createEffect(() => {
      state.forecastMetadata
        .fetchOutputVariableAtHourOffset(cumulusDepthVariable, state.hourOffset)
        .then(grid => set(new CumuliDepthRenderer(grid)));
    });
    return get
  },
  MapKey: () => colorScaleEl(cumuliDepthColorScale, value => `${value} m `),
  Help: () => <>
    <p>
      Cumulus clouds are clouds caused by thermal activity. No cumulus clouds
      means no thermals or blue thermals. Deep cumulus clouds means there is
      risk of overdevelopment.
    </p>
    <p>The color scale is shown on the bottom left of the screen.</p>
  </>
});
