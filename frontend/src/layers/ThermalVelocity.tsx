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

const thermalVelocityColorScale = new ColorScale([
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
