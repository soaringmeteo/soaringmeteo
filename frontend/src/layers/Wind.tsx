import { drawWindArrow } from "../shapes";
import { Forecast, ForecastPoint } from "../data/Forecast";
import * as L from 'leaflet';
import { Renderer } from "../map/CanvasLayer";
import { Layer, windColor, windScaleEl } from "./Layer";

class Wind implements Renderer {

  constructor(readonly forecast: Forecast, readonly wind: ((forecast: ForecastPoint) => [number, number])) {}

  renderPoint(forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    const center = L.point((topLeft.x + bottomRight.x) / 2, (topLeft.y + bottomRight.y) / 2);
    const width  = bottomRight.x - topLeft.x;
    const [u, v] = this.wind(forecastAtPoint);
    drawWindArrow(ctx, center.x, center.y, width, windColor(0.30), u, v);
  }

  summary(forecastPoint: ForecastPoint): Array<[string, string]> {
    const [u, v] = this.wind(forecastPoint);
    const windSpeed = Math.sqrt(u * u + v * v);
    return [
      ["Wind speed", `${ Math.round(windSpeed) } km/h`]
    ]
  }

}

const help = <p>
  The wind speed and direction are shown with an arrow. The wind flows in the
  direction of the arrow. For instance, an arrow that points to the right means
  that the wind comes from west and goes to east. The number of barbells, in the
  arrow, indicate the speed with a precision of 2.5 km/h. For instance, an arrow
  with a single short arm indicate a speed between 0 and 2.5 km/h. If it has two
  short arms, it means a speed between 2.5 and 5 km/h. Two long arms mean a speed
  between 7.5 and 10 km/h. Four long arms mean a speed between 17.5 and 20 km/h,
  and so on. You can see some examples on the left of the screen.
</p>;

export const surfaceWindLayer = new Layer(
  'Surface',
  'Wind force and direction on the ground',
  forecast => new Wind(forecast, (point) => [point.uSurfaceWind, point.vSurfaceWind]),
  windScaleEl,
  help
);

export const _300MAGLWindLayer = new Layer(
  '300 m AGL',
  'Wind force and direction at 300 m above the ground level',
  forecast => new Wind(forecast, (forecast) => [forecast.u300MWind, forecast.v300MWind]),
  windScaleEl,
  help
);

export const boundaryLayerWindLayer = new Layer(
  'Boundary Layer',
  'Average wind force and direction in the boundary layer',
  forecast => new Wind(forecast, (point) => [point.uWind, point.vWind]),
  windScaleEl,
  help
);

export const boundaryLayerTopWindLayer = new Layer(
  'Boundary Layer Top',
  'Wind force and direction at the top of the boundary layer',
  forecast => new Wind(forecast, (point) => [point.uBLTopWind, point.vBLTopWind]),
  windScaleEl,
  help
);
