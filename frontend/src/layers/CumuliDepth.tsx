import { Forecast, ForecastPoint } from "../data/Forecast";
import { ColorScale, Color } from "../ColorScale";
import * as L from 'leaflet';
import { Renderer } from "../map/CanvasLayer";
import { colorScaleEl, Layer } from "./Layer";

const colorScale = new ColorScale([
  [50,   new Color(0xff, 0xff, 0xff, 0)],
  [400,  new Color(0xff, 0xff, 0xff, 0.25)],
  [800,  new Color(0xff, 0xff, 0xff, 0.5)],
  [1500, new Color(0xff, 0xff, 0x00, 0.5)],
  [3000, new Color(0xff, 0x00, 0x00, 0.5)]
]);

class CumuliDepth implements Renderer {

  constructor(readonly forecast: Forecast) {}

  renderPoint(forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    if (forecastAtPoint !== undefined) {
      const color = colorScale.closest(forecastAtPoint.cumuliDepth);
      ctx.save();
      ctx.fillStyle = color.css();
      ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
      ctx.restore();
    }
  }

  summary(forecastPoint: ForecastPoint): Array<[string, string]> {
    return [
      ["Cumuli depth", `${ forecastPoint.cumuliDepth } m`]
    ]
  }

}

export const cumuliDepthLayer = new Layer(
  'Cumulus Clouds',
  'Cumulus clouds depth',
  forecast => new CumuliDepth(forecast),
  colorScaleEl(colorScale, value => `${value} m `),
  <>
    <p>
      Cumulus clouds are clouds caused by thermal activity. No cumulus clouds
      means no thermals or blue thermals. Deep cumulus clouds means there is
      risk of overdevelopment.
    </p>
    <p>The color scale is shown on the bottom left of the screen.</p>
  </>
);
