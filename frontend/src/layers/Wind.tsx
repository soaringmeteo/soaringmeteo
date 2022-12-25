import { JSX, Show } from "solid-js";
import { drawWindArrow } from "../shapes";
import { Forecast, ForecastPoint } from "../data/Forecast";
import * as L from 'leaflet';
import { Renderer } from "../map/CanvasLayer";
import { windColor } from "./Layer";
import { Domain } from "../State";

export class Wind implements Renderer {

  constructor(readonly forecast: Forecast, readonly wind: ((forecast: ForecastPoint) => [number, number]), readonly domain: Domain) {}

  renderPoint(forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    const center = L.point((topLeft.x + bottomRight.x) / 2, (topLeft.y + bottomRight.y) / 2);
    const width  = bottomRight.x - topLeft.x;
    const [u, v] = this.wind(forecastAtPoint);
    drawWindArrow(
      ctx,
      center.x,
      center.y,
      width,
      windColor(this.domain.state.windNumericValuesShown ? 0.75 : 0.30),
      u,
      v,
      this.domain.state.windNumericValuesShown
    );
  }

  summary(forecastPoint: ForecastPoint): Array<[string, string]> {
    const [u, v] = this.wind(forecastPoint);
    const windSpeed = Math.sqrt(u * u + v * v);
    return [
      ["Wind speed", `${ Math.round(windSpeed) } km/h`]
    ]
  }

}

export const help = (windNumericValuesShown: () => boolean): JSX.Element =>
  <Show
    when={ !windNumericValuesShown() }
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
      that the wind comes from west and goes to east. The number of barbells, in the
      arrow, indicate the speed with a precision of 2.5 km/h. For instance, an arrow
      with a single short arm indicate a speed between 0 and 2.5 km/h. If it has two
      short arms, it means a speed between 2.5 and 5 km/h. Two long arms mean a speed
      between 7.5 and 10 km/h. Four long arms mean a speed between 17.5 and 20 km/h,
      and so on. You can see some examples on the left of the screen.
    </p>
  </Show>;
