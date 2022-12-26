import { JSX } from "solid-js";
import { Color, ColorScale } from "../ColorScale";
import { Forecast } from "../data/Forecast";
import { Renderer } from "../map/CanvasLayer";

/**
 * A layer shown over the map (boundary layer height, cloud cover, etc.)
 */
 export class Layer {

  constructor(
    readonly key: string,
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
