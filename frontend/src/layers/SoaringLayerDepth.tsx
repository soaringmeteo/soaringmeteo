import * as L from 'leaflet';
import { ColorScale, Color } from "../ColorScale";
import { soaringLayerDepthVariable as soaringLayerDepthVariable } from '../data/OutputVariable';
import { colorScaleEl, Layer, ReactiveComponents } from './Layer';
import { createResource, JSX } from 'solid-js';
import { ForecastMetadata } from '../data/ForecastMetadata';

export const soaringLayerDepthLayer: Layer = {

  key: 'soaring-layer-depth',

  name: 'Soaring Layer Depth',

  title: 'Soaring layer depth',

  reactiveComponents(props: {
    forecastMetadata: ForecastMetadata,
    hourOffset: number
  }): ReactiveComponents {

    const [soaringLayerDepthGrid] =
      createResource(
        () => ({ forecastMetadata: props.forecastMetadata, hourOffset: props.hourOffset }),
        data => data.forecastMetadata.fetchOutputVariableAtHourOffset(soaringLayerDepthVariable, data.hourOffset)
      );

    const renderer = () => {
      const grid = soaringLayerDepthGrid();
      return {
        renderPoint(lat: number, lng: number, averagingFactor: number, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
          grid?.mapViewPoint(lat, lng, averagingFactor, soaringLayerDepth => {
            const color = soaringLayerDepthColorScale.closest(soaringLayerDepth);
            ctx.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.25)`;
            ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
          });
        }
      }
    };

    const summarizer = () => {
      const grid = soaringLayerDepthGrid();
      return {
        async summary(lat: number, lng: number): Promise<Array<[string, JSX.Element]> | undefined> {
          return grid?.mapViewPoint(lat, lng, 1, soaringLayerDepth =>
            [
              ["Soaring layer depth", <span>{ soaringLayerDepth } m</span>]
            ]
          )
        }
      }
    };

    const mapKey = colorScaleEl(soaringLayerDepthColorScale, value => `${value} m `);

    const help = <>
      <p>
        The soaring layer is the area of the atmosphere where we can expect to find thermals and
        soar. The depth of the soaring layer tells us how high we can soar. For instance, a value
        of 850 m means that we can soar up to 850 m above the ground level. Values higher than
        750 m are preferable to fly cross-country.
      </p>
      <p>
        In case of “blue thermals”, the soaring layer is
        the <a href="https://wikipedia.org/wiki/Planetary_boundary_layer" target="_blank">planetary
        boundary layer</a>, otherwise (if there are cumulus clouds) it stops at the cloud base.
      </p>
      <p>
        The color scale is shown on the bottom left of the screen.
      </p>
    </>;

    return {
      renderer,
      summarizer,
      mapKey,
      help
    }
  }

};

const soaringLayerDepthColorScale = new ColorScale([
  [250,  new Color(0x33, 0x33, 0x33, 1)],
  [500,  new Color(0x99, 0x00, 0x99, 1)],
  [750,  new Color(0xff, 0x00, 0x00, 1)],
  [1000, new Color(0xff, 0x99, 0x00, 1)],
  [1250, new Color(0xff, 0xcc, 0x00, 1)],
  [1500, new Color(0xff, 0xff, 0x00, 1)],
  [1750, new Color(0x66, 0xff, 0x00, 1)],
  [2000, new Color(0x00, 0xff, 0xff, 1)],
  [2250, new Color(0x99, 0xff, 0xff, 1)],
  [2500, new Color(0xff, 0xff, 0xff, 1)]
]);
