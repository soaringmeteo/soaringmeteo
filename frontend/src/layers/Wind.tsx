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

export const surfaceWindLayer = new Layer(
  'Surface',
  'Wind force and direction on the ground',
  forecast => new Wind(forecast, (point) => [point.uSurfaceWind, point.vSurfaceWind]),
  windScaleEl
);

export const _300MAGLWindLayer = new Layer(
  '300 m AGL',
  'Wind force and direction at 300 m above the ground level',
  forecast => new Wind(forecast, (forecast) => [forecast.u300MWind, forecast.v300MWind]),
  windScaleEl
);

export const boundaryLayerWindLayer = new Layer(
  'Boundary Layer',
  'Average wind force and direction in the boundary layer',
  forecast => new Wind(forecast, (point) => [point.uWind, point.vWind]),
  windScaleEl
);

export const boundaryLayerTopWindLayer = new Layer(
  'Boundary Layer Top',
  'Wind force and direction at the top of the boundary layer',
  forecast => new Wind(forecast, (point) => [point.uBLTopWind, point.vBLTopWind]),
  windScaleEl
);
