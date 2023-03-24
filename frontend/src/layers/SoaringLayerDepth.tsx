import * as L from 'leaflet';
import { ColorScale, Color } from "../ColorScale";
import { Grid } from '../data/Grid';
import { Renderer } from "../map/CanvasLayer";
import { soaringLayerDepthVariable as soaringLayerDepthVariable } from '../data/OutputVariable';
import { colorScaleEl, Layer } from './Layer';
import { createEffect, createSignal } from 'solid-js';

export const soaringLayerDepthLayer = new Layer({

  key: 'soaring-layer-depth',

  name: 'Soaring Layer Depth',

  title: 'Soaring layer depth',

  renderer: state => {
    const [get, set] = createSignal<Renderer>();
    createEffect(() => {
      state.forecastMetadata
        .fetchOutputVariableAtHourOffset(soaringLayerDepthVariable, state.hourOffset)
        .then(grid => set(new SoaringLayerDepthRenderer(grid)))
    });
    return get
  },

  MapKey: () => colorScaleEl(soaringLayerDepthColorScale, value => `${value} m `),

  Help: () => <>
    <p>
      The soaring layer is the area of the atmosphere where we can expect to find thermals and
      soar. The depth of the soaring layer tells us how high we can soar. For instance, a value
      of 850 m means that we can soar up to 850 m above the ground level. Values higher than
      750 m are preferable to fly cross-country.
    </p>
    <p>
      In case of “blue thermals”, the soaring layer is
      the <a href="https://wikipedia.org/wiki/Planetary_boundary_layer" target="_blank">planetary
      boundary layer</a>, otherwise (if there are cumulus clouds) it stops at the cloud base.
    </p>
    <p>
      The color scale is shown on the bottom left of the screen.
    </p>
  </>
});

class SoaringLayerDepthRenderer implements Renderer {

  constructor(readonly grid: Grid<number>) {}

  renderPoint(lat: number, lng: number, averagingFactor: number, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    this.grid.mapViewPoint(lat, lng, averagingFactor, soaringLayerDepth => {
      const color = soaringLayerDepthColorScale.closest(soaringLayerDepth);
      ctx.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.25)`;
      ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    });
  }

  summary(lat: number, lng: number, averagingFactor: number): Array<[string, string]> | undefined {
    return this.grid.mapViewPoint(lat, lng, averagingFactor, soaringLayerDepth =>
      [
        ["Soaring layer depth", `${ soaringLayerDepth } m`]
      ]
    )
  }

}

const soaringLayerDepthColorScale = new ColorScale([
  [250,  new Color(0x33, 0x33, 0x33, 1)],
  [500,  new Color(0x99, 0x00, 0x99, 1)],
  [750,  new Color(0xff, 0x00, 0x00, 1)],
  [1000, new Color(0xff, 0x99, 0x00, 1)],
  [1250, new Color(0xff, 0xcc, 0x00, 1)],
  [1500, new Color(0xff, 0xff, 0x00, 1)],
  [1750, new Color(0x66, 0xff, 0x00, 1)],
  [2000, new Color(0x00, 0xff, 0xff, 1)],
  [2250, new Color(0x99, 0xff, 0xff, 1)],
  [2500, new Color(0xff, 0xff, 0xff, 1)]
]);
