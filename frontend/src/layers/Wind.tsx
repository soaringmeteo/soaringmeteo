import { Accessor, createEffect, createSignal, JSX, Show } from "solid-js";
import { drawWindArrow } from "../shapes";
import * as L from 'leaflet';
import { Renderer } from "../map/CanvasLayer";
import { Layer, windColor } from "./Layer";
import { Grid } from "../data/Grid";
import { State } from "../State";
import { OutputVariable, wind300mAglVariable, windBoundaryLayerVariable, windSoaringLayerTopVariable, windSurfaceVariable } from "../data/OutputVariable";

class WindRenderer implements Renderer {

  constructor(readonly grid: Grid<[number, number]>, readonly windNumericValuesShown: boolean) {}

  renderPoint(latitude: number, longitude: number, averagingFactor: number, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    this.grid.mapViewPoint(latitude, longitude, averagingFactor, ([u, v]) => {
      const center = L.point((topLeft.x + bottomRight.x) / 2, (topLeft.y + bottomRight.y) / 2);
      const width  = bottomRight.x - topLeft.x;
      drawWindArrow(
        ctx,
        center.x,
        center.y,
        width,
        windColor(this.windNumericValuesShown ? 0.75 : 0.30),
        u,
        v,
        this.windNumericValuesShown
      );
    });
  }

  summary(latitude: number, longitude: number, averagingFactor: number): Array<[string, string]> | undefined {
    return this.grid.mapViewPoint(latitude, longitude, averagingFactor, ([u, v]) => {
      const windSpeed = Math.sqrt(u * u + v * v);
      return [
        ["Wind speed", `${ Math.round(windSpeed) } km/h`]
      ]
    });
  }

}

const Help = (props: { state: State }): JSX.Element =>
  <Show
    when={ !props.state.windNumericValuesShown }
    fallback={
      <p>
        The wind speed and direction are shown with an arrow. The wind flows in
        the direction of the arrow. For instance, an arrow that points to the right
        means that the wind comes from west and goes to east.
      </p>
    }
  >
    <p>
      The wind speed and direction are shown with an arrow. The wind flows in the
      direction of the arrow. For instance, an arrow that points to the right means
      that the wind comes from west and goes to east. The number of barb “flags”, in the
      arrow, indicates the speed with a precision of 2.5 km/h. For instance, an arrow
      with a single short flag indicate a speed between 0 and 2.5 km/h. If it has two
      short flags, it means a speed between 2.5 and 5 km/h. Two long flags mean a speed
      between 7.5 and 10 km/h. Four long flags mean a speed between 17.5 and 20 km/h,
      and so on. You can see some examples on the left of the screen.
    </p>
  </Show>;

const MapKey = (props: { state: State }): JSX.Element =>
  <Show when={!props.state.windNumericValuesShown}>
    <div>
      {
        [2.5, 5, 10, 17.5, 25].map((windSpeed) => {
          const canvas = <canvas style={{ width: '30px', height: '20px', border: 'thin solid black' }} /> as HTMLCanvasElement;
          canvas.width = 30;
          canvas.height = 20;
          const ctx = canvas.getContext('2d');
          if (ctx === null) { return }
          drawWindArrow(ctx, canvas.width / 2, canvas.height / 2, canvas.width - 4, windColor(0.50), windSpeed, 0, false);
          return (
            <div style={{ 'margin-bottom': '2px' }}>
              <div>{`${windSpeed} km/h `}</div>
              {canvas}
            </div>
          )
        })
      }
    </div>
  </Show>;

const renderer = (outputVariable: OutputVariable<[number, number]>): ((state: State) => Accessor<Renderer | undefined>) => {
  return state => {
    const [getGrid, setGrid] = createSignal<Grid<[number, number]>>();
    createEffect(() => {
      state.forecastMetadata
        .fetchOutputVariableAtHourOffset(outputVariable, state.hourOffset)
        .then(setGrid);
    });
    return () => {
      const grid = getGrid();
      if (grid === undefined) return undefined
      else return new WindRenderer(grid, state.windNumericValuesShown)
    }
  }
};

export const boundaryLayerWindLayer = new Layer({
  key: 'boundary-layer-wind',
  name: 'Boundary Layer',
  title: 'Average wind force and direction in the boundary layer',
  renderer: renderer(windBoundaryLayerVariable),
  MapKey,
  Help
});

export const surfaceWindLayer = new Layer({
  key: 'surface-wind',
  name: 'Surface',
  title: 'Wind force and direction on the ground',
  renderer: renderer(windSurfaceVariable),
  MapKey,
  Help
});

export const _300MAGLWindLayer = new Layer({
  key: '300m-agl-wind',
  name: '300 m AGL',
  title: 'Wind force and direction at 300 m above the ground level',
  renderer: renderer(wind300mAglVariable),
  MapKey,
  Help
});

export const soaringLayerTopWindLayer = new Layer({
  key: 'soaring-layer-top-wind',
  name: 'Soaring Layer Top',
  title: 'Wind force and direction at the top of the soaring layer',
  renderer: renderer(windSoaringLayerTopVariable),
  MapKey,
  Help
});
