import { JSX } from "solid-js";
import { Color, ColorScale } from "../ColorScale";
import { Forecast } from "../data/Forecast";
import { Renderer } from "../map/CanvasLayer";
import { drawWindArrow } from "../shapes";

/**
 * A layer shown over the map (boundary layer height, cloud cover, etc.)
 */
 export class Layer {

  constructor(
    readonly name: string,
    readonly title: string,
    readonly createRenderer: (forecast: Forecast) => Renderer,
    readonly mapKeyEl: JSX.Element,
    readonly help: JSX.Element
  ) {}

}

export const colorScaleEl = (colorScale: ColorScale, format: (value: number) => string): JSX.Element => {
  const colorsAndValues: Array<[Color, string]> = colorScale.points.slice().reverse().map(([value, color]) => [color, format(value)]);
  const length = colorsAndValues.reduce((n, [_, s]) => s.length > n ? s.length : n, 0);
  return <div style={{ width: `${length * 2 / 3}em`, 'padding-top': '0.3em' /* because text overflows */, margin: 'auto' }}>
  {
    colorsAndValues.map(([color, value]) =>
      <div style={{ height: '2em', 'background-color': color.css(), position: 'relative' }}>
        <span style={{ position: 'absolute', top: '-.6em', right: '0.5em', 'text-shadow': 'white 1px 1px 2px' }}>{value}</span>
      </div>
    )
  }
  </div>
  };

export const windColor = (opacity: number): string => `rgba(62, 0, 0, ${opacity})`;

export const windScaleEl: JSX.Element =
  <div>
    {
      [2.5, 5, 10, 17.5, 25].map((windSpeed) => {
        const canvas = <canvas style={{ width: '30px', height: '20px', border: 'thin solid black' }} /> as HTMLCanvasElement;
        canvas.width = 30;
        canvas.height = 20;
        const ctx = canvas.getContext('2d');
        if (ctx === null) { return }
        drawWindArrow(ctx, canvas.width / 2, canvas.height / 2, canvas.width - 4, windColor(0.50), windSpeed, 0);
        return (
          <div style={{ 'margin-bottom': '2px' }}>
            <div>{`${windSpeed} km/h `}</div>
            {canvas}
          </div>
        )
      })
    }
  </div>;
