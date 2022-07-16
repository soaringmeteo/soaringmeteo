import { Forecast, ForecastPoint } from "../data/Forecast";
import { ColorScale, Color } from "../ColorScale";
import * as L from 'leaflet';
import { drawWindArrow } from "../shapes";
import { windColor } from "./Wind";
import { DataSource } from "../CanvasLayer";
import { JSX } from "solid-js";

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

export class ThQ implements DataSource {

  constructor(readonly forecast: Forecast) {}

  renderPoint(forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    if (forecastAtPoint !== undefined) {
      const center = L.point((topLeft.x + bottomRight.x) / 2, (topLeft.y + bottomRight.y) / 2);
      const width  = bottomRight.x - topLeft.x;

      const thq = value(
        forecastAtPoint.thermalVelocity,
        forecastAtPoint.boundaryLayerDepth,
        forecastAtPoint.uWind,
        forecastAtPoint.vWind
      );

      const color = colorScale.closest(thq);
      ctx.save();
      ctx.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.25)`;
      ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
      ctx.restore();
      drawWindArrow(ctx, center.x, center.y, width, windColor(0.25), forecastAtPoint.uWind, forecastAtPoint.vWind);
    }
  }

  summary(forecastAtPoint: ForecastPoint): JSX.Element {
    const thq = value(
      forecastAtPoint.thermalVelocity,
      forecastAtPoint.boundaryLayerDepth,
      forecastAtPoint.uWind,
      forecastAtPoint.vWind
    );

    const [u, v] = [forecastAtPoint.uWind, forecastAtPoint.vWind];
    const windSpeed = Math.sqrt(u * u + v * v); 

    return <table>
      <tbody>
        <tr><th>XC Flying Potential: </th><td>{ thq }%</td></tr>
        <tr><th>Boundary layer depth: </th><td>{ forecastAtPoint.boundaryLayerDepth }&nbsp;m</td></tr>
        <tr><th>Thermal velocity: </th><td>{ forecastAtPoint.thermalVelocity }&nbsp;m/s</td></tr>
        <tr><th>Boundary layer wind:</th><td>{ Math.round(windSpeed) }&nbsp;km/h</td></tr>
        <tr><th>Total cloud cover: </th><td>{ Math.round(forecastAtPoint.cloudCover * 100) }%</td></tr>
      </tbody>
    </table>;
  }

}

/**
 * @param thermalVelocity    Thermal velocity in m/s
 * @param boundaryLayerDepth Depth of the boundary layer in meters
 * @param uWind              U part of wind in boundary layer in km/h
 * @param vWind              V part of wind in boundary layer in km/h
 * @returns A value between 0 and 100
 */
export const value = (thermalVelocity: number, boundaryLayerDepth: number, uWind: number, vWind: number): number => {
  // Thermal velocity
  // coeff is 50% for a 1.5 m/s
  const thermalVelocityCoeff = logistic(thermalVelocity, 1.50, 6);

  // Boundary Layer Depth
  // coeff is 50% for a boundary layer depth of 400 m
  const bldCoeff = logistic(boundaryLayerDepth, 400, 4);

  const thermalCoeff = (2 * thermalVelocityCoeff + bldCoeff) / 3;

  // Boundary Layer Wind
  const u = uWind;
  const v = vWind;
  const windForce = Math.sqrt(u * u + v * v);
  // coeff is 50% for a wind force of 16 km/h
  const windCoeff = 1 - logistic(windForce, 16, 6);

  return Math.round(thermalCoeff * windCoeff * 100)
};

/**
 * Logistic function (see https://en.wikipedia.org/wiki/Logistic_regression#Model)
 * @param x  input
 * @param mu “location parameter” (midpoint of the curve, where output = 50%)
 * @param k  steepness (value like 4 is quite smooth, whereas 7 is quite steep)
 */
const logistic = (x: number, mu: number, k: number): number => {
  const L = 1; // Output max value. In our case we want the output to be a value between 0 and 1
  const s = mu / k;
  return L / (1 + Math.exp(-(x - mu) / s))
};
