import { createResource, JSX, Show } from "solid-js";
import { drawWindArrow } from "../shapes";
import * as L from 'leaflet';
import { Layer, ReactiveComponents, windColor } from "./Layer";
import { OutputVariable, wind2000mAmslVariable, wind3000mAmslVariable, wind300mAglVariable, wind4000mAmslVariable, windBoundaryLayerVariable, windSoaringLayerTopVariable, windSurfaceVariable } from "../data/OutputVariable";
import { ForecastMetadata } from "../data/ForecastMetadata";

const windComponents = (windVariable: OutputVariable<[number, number]>) => (props: {
  forecastMetadata: ForecastMetadata,
  hourOffset: number,
  windNumericValuesShown: boolean
}): ReactiveComponents => {

  const [windGrid] =
    createResource(
      () => ({ forecastMetadata: props.forecastMetadata, hourOffset: props.hourOffset }),
      data => data.forecastMetadata.fetchOutputVariableAtHourOffset(windVariable, data.hourOffset)
    );

  const renderer = () => {
    const grid = windGrid();
    return {
      renderPoint(latitude: number, longitude: number, averagingFactor: number, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
        grid?.mapViewPoint(latitude, longitude, averagingFactor, ([u, v]) => {
          const center = L.point((topLeft.x + bottomRight.x) / 2, (topLeft.y + bottomRight.y) / 2);
          const width = bottomRight.x - topLeft.x;
          drawWindArrow(
            ctx,
            center.x,
            center.y,
            width,
            windColor(props.windNumericValuesShown ? 0.75 : 0.30),
            u,
            v,
            props.windNumericValuesShown
          );
        });
      }
    }
  };

  const summarizer = () => {
    const grid = windGrid();
    return {
      async summary(latitude: number, longitude: number): Promise<Array<[string, JSX.Element]> | undefined> {
        return grid?.mapViewPoint(latitude, longitude, 1, ([u, v]) => {
          const windSpeed = Math.sqrt(u * u + v * v);
          return [
            ["Wind speed", <span>{ Math.round(windSpeed) } km/h</span>]
          ]
        });
      }
    }
  };

  const mapKey =
    <Show when={!props.windNumericValuesShown}>
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


  const help =
    <Show
      when={!props.windNumericValuesShown}
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

  return {
    renderer,
    summarizer,
    mapKey: mapKey,
    help: help
  }
};

export const boundaryLayerWindLayer: Layer = {
  key: 'boundary-layer-wind',
  name: 'Boundary Layer',
  title: 'Average wind force and direction in the boundary layer',
  reactiveComponents: windComponents(windBoundaryLayerVariable)
};

export const surfaceWindLayer: Layer = {
  key: 'surface-wind',
  name: 'Surface',
  title: 'Wind force and direction on the ground',
  reactiveComponents: windComponents(windSurfaceVariable)
};

export const soaringLayerTopWindLayer: Layer = {
  key: 'soaring-layer-top-wind',
  name: 'Soaring Layer Top',
  title: 'Wind force and direction at the top of the soaring layer',
  reactiveComponents: windComponents(windSoaringLayerTopVariable)
};

export const _300MAGLWindLayer: Layer = {
  key: '300m-agl-wind',
  name: '300 m AGL',
  title: 'Wind force and direction at 300 m above the ground level',
  reactiveComponents: windComponents(wind300mAglVariable)
};

export const _2000MAMSLWindLayer: Layer = {
  key: '2000m-amsl-wind',
  name: '2000 m AMSL',
  title: 'Wind force and direction at 2000 m above the mean sea level',
  reactiveComponents: windComponents(wind2000mAmslVariable)
};

export const _3000MAMSLWindLayer: Layer = {
  key: '3000m-amsl-wind',
  name: '3000 m AMSL',
  title: 'Wind force and direction at 3000 m above the mean sea level',
  reactiveComponents: windComponents(wind3000mAmslVariable)
};

export const _4000MAMSLWindLayer: Layer = {
  key: '4000m-amsl-wind',
  name: '4000 m AMSL',
  title: 'Wind force and direction at 4000 m above the mean sea level',
  reactiveComponents: windComponents(wind4000mAmslVariable)
};
