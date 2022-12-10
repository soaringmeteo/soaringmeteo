import { Forecast, ForecastPoint } from "../data/Forecast";
import * as L from 'leaflet';
import { ColorScale, Color } from "../ColorScale";
import { Renderer } from "../map/CanvasLayer";
import { colorScaleEl, Layer } from "./Layer";

class ThermalVelocity implements Renderer {

  constructor(readonly forecast: Forecast) {}

  renderPoint(forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    const color = thermalVelocityColorScale.closest(forecastAtPoint.thermalVelocity);
    ctx.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.25)`;
    ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
  }

  summary(forecastPoint: ForecastPoint): Array<[string, string]> {
    return [
      ["Thermal velocity", `${ forecastPoint.thermalVelocity } m/s`]
    ]
  }

}

export const thermalVelocityColorScale = new ColorScale([
  [0.5, new Color(0x79, 0xec, 0xe2, 1)],
  [1.0, new Color(0x6e, 0xed, 0xa3, 1)],
  [1.5, new Color(0x6e, 0xef, 0x62, 1)],
  [2.0, new Color(0xb0, 0xf0, 0x56, 1)],
  [2.5, new Color(0xf3, 0xe5, 0x49, 1)],
  [3.0, new Color(0xf6, 0x8a, 0x3c, 1)],
      ]);

export const thermalVelocityLayer = new Layer(
  'Thermal Velocity',
  'Thermal updraft velocity',
  forecast => new ThermalVelocity(forecast),
  colorScaleEl(thermalVelocityColorScale, value => `${value} m/s `),
  <p>
    The thermal updraft velocity is estimated from the depth of the boundary
    layer and the sunshine. The color scale is shown on the bottom left of the
    screen.
  </p>
);
