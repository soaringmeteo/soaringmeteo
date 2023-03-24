import { ColorScale, Color } from "../ColorScale";
import * as L from 'leaflet';
import { Renderer } from "../map/CanvasLayer";
import { FourGrids, Grid } from "../data/Grid";
import { colorScaleEl, Layer } from "./Layer";
import { createEffect, createSignal } from "solid-js";
import { cloudCoverVariable, soaringLayerDepthVariable, thermalVelocityVariable, windBoundaryLayerVariable } from "../data/OutputVariable";
import { Averager } from "../data/Averager";

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

type XCFlyingPotentialData = {
  xcPotential: number,
  thermalVelocity: number,
  soaringLayerDepth: number,
  soaringLayerWind: {
    u: number,
    v: number
  },
  cloudCover: number
};

const averager: Averager<XCFlyingPotentialData> = {
  average(as: Array<XCFlyingPotentialData>): XCFlyingPotentialData {
    let xcPotentialTotal = 0;
    let thermalVelocityTotal = 0;
    let soaringLayerDepthTotal = 0;
    let soaringLayerWindUTotal = 0;
    let soaringLayerWindVTotal = 0;
    let cloudCoverTotal = 0;
    as.forEach(data => {
      xcPotentialTotal = xcPotentialTotal + data.xcPotential;
      thermalVelocityTotal = thermalVelocityTotal + data.thermalVelocity;
      soaringLayerDepthTotal = soaringLayerDepthTotal + data.soaringLayerDepth;
      soaringLayerWindUTotal = soaringLayerWindUTotal + data.soaringLayerWind.u;
      soaringLayerWindVTotal = soaringLayerWindVTotal + data.soaringLayerWind.v;
      cloudCoverTotal = cloudCoverTotal + data.cloudCover;
    });
    return {
      xcPotential: xcPotentialTotal / as.length,
      thermalVelocity: thermalVelocityTotal / as.length,
      soaringLayerDepth: soaringLayerDepthTotal / as.length,
      soaringLayerWind: {
        u: soaringLayerWindUTotal / as.length,
        v: soaringLayerWindVTotal / as.length
      },
      cloudCover: cloudCoverTotal / as.length
    }
  },
}

export const xcFlyingPotentialLayer = new Layer({

  key: 'xc-flying-potential',

  name: 'XC Flying Potential',

  title: 'XC flying potential',

  renderer: (state) => {
    const [get, set] = createSignal<Renderer>();
    createEffect(() => {
      const soaringLayerDepthPromise =
        state.forecastMetadata.fetchOutputVariableAtHourOffset(soaringLayerDepthVariable, state.hourOffset);
      const windBoundaryLayerPromise =
        state.forecastMetadata.fetchOutputVariableAtHourOffset(windBoundaryLayerVariable, state.hourOffset);
      const thermalVelocityPromise =
        state.forecastMetadata.fetchOutputVariableAtHourOffset(thermalVelocityVariable, state.hourOffset);
      const cloudCoverPromise =
        state.forecastMetadata.fetchOutputVariableAtHourOffset(cloudCoverVariable, state.hourOffset);
      Promise.all([soaringLayerDepthPromise, windBoundaryLayerPromise, thermalVelocityPromise, cloudCoverPromise])
        .then(([soaringLayerDepthGrid, windBoundaryLayerGrid, thermalVelocityGrid, cloudCoverGrid]) => {
          const grid =
            new FourGrids(
              soaringLayerDepthGrid, windBoundaryLayerGrid, thermalVelocityGrid, cloudCoverGrid,
              (soaringLayerDepth, windBoundaryLayer, thermalVelocity, cloudCover) => ({
                xcPotential: value(thermalVelocity, soaringLayerDepth, windBoundaryLayer[0], windBoundaryLayer[1]),
                thermalVelocity: thermalVelocity,
                soaringLayerDepth: soaringLayerDepth,
                soaringLayerWind: {
                  u: windBoundaryLayer[0],
                  v: windBoundaryLayer[1]
                },
                cloudCover: cloudCover
              })
            );
          set(new XCFlyingPotentialRenderer(grid));
        })
    });
    return get
  },

  MapKey: () => colorScaleEl(colorScale, value => `${value}% `),

  Help: () => <>
    <p>
      The XC flying potential index is a single indicator that takes into account
      the soaring layer depth, the sunshine, and the average wind speed within the
      boundary layer. Deep soaring layer, strong sunshine, and low wind speeds
      increase the value of this indicator.
    </p>
    <p>
      The color scale is shown on the bottom left of the screen. Click to a location
      on the map to get numerical data.
    </p>
  </>
  
});

class XCFlyingPotentialRenderer implements Renderer {

  constructor(readonly grid: Grid<XCFlyingPotentialData>) {}

  renderPoint(latitude: number, longitude: number, averagingFactor: number, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    this.grid.mapViewPoint(latitude, longitude, averagingFactor, averager, data => {
      const color = colorScale.closest(data.xcPotential);
      ctx.save();
      ctx.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.25)`;
      ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
      ctx.restore();
    });
  }

  summary(latitude: number, longitude: number, averagingFactor: number): Array<[string, string]> | undefined {
    return this.grid.mapViewPoint(latitude, longitude, averagingFactor, averager, data => [
      ["XC Flying Potential", `${data.xcPotential}%`],
      ["Soaring layer depth", `${data.soaringLayerDepth} m`],
      ["Thermal velocity",    `${data.thermalVelocity} m/s`],
      ["Total cloud cover",   `${Math.round(data.cloudCover * 100)}%`]
    ])
  }

}

/**
 * @param thermalVelocity   Thermal velocity in m/s
 * @param soaringLayerDepth Depth of the boundary layer in meters
 * @param uWind             U part of wind in boundary layer in km/h
 * @param vWind             V part of wind in boundary layer in km/h
 * @returns A value between 0 and 100
 */
export const value = (thermalVelocity: number, soaringLayerDepth: number, uWind: number, vWind: number): number => {
  // Thermal velocity
  // coeff is 50% for a 1.55 m/s
  const thermalVelocityCoeff = logistic(thermalVelocity, 1.55, 5);

  // Soaring Layer Depth
  // coeff is 50% for a soaring layer depth of 400 m
  const bldCoeff = logistic(soaringLayerDepth, 400, 4);

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
