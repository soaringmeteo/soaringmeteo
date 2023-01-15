import { JSX, Show } from "solid-js";
import { drawWindArrow } from "../shapes";
import { boundaryLayerDepthKey, boundaryLayerTopWindKey, boundaryLayerWindKey, cloudCoverKey, cumuliDepthKey, noneKey, rainKey, Domain, surfaceWindKey, thermalVelocityKey, xcFlyingPotentialKey, _300MAGLWindKey } from "../State";
import { soaringLayerDepthColorScale, SoaringLayerDepth } from "./SoaringLayerDepth";
import { CloudCover, cloudCoverColorScale } from "./CloudCover";
import { CumuliDepth, cumuliDepthColorScale } from "./CumuliDepth";
import { colorScaleEl, Layer, windColor } from "./Layer";
import { None } from "./None";
import { Rain, rainColorScale } from "./Rain";
import { ThermalVelocity, thermalVelocityColorScale } from "./ThermalVelocity";
import { ThQ, colorScale as thQColorScale } from "./ThQ";
import { Wind, help as windHelp } from "./Wind";

export const xcFlyingPotentialName = 'XC Flying Potential';

export class Layers {

  private readonly layersByKey: Map<string, Layer>
  private readonly xcFlyingPotentialLayer: Layer

  constructor(stateProvider: Domain) {

    this.xcFlyingPotentialLayer = new Layer(
      xcFlyingPotentialKey,
      xcFlyingPotentialName,
      'XC flying potential',
      forecast => new ThQ(forecast),
      colorScaleEl(thQColorScale, value => `${value}% `),
      <>
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
    );    

    const boundaryLayerDepthLayer = new Layer(
      boundaryLayerDepthKey,
      'Soaring Layer Depth',
      'Soaring layer depth',
      forecast => new SoaringLayerDepth(forecast),
      colorScaleEl(soaringLayerDepthColorScale, value => `${value} m `),
      <>
        <p>
          This value tells us how high above the ground level we can soar. For instance, a value of 850 m
          means that we can soar up to 850 m above the ground level. Values higher than 750 m are preferable
          to fly cross-country.
        </p>
        <p>
          In case of “blue thermals”, we show
          the <a href="https://wikipedia.org/wiki/Planetary_boundary_layer" target="_blank">planetary
          boundary layer</a> depth, otherwise (if there are cumulus clouds) we show the altitude of the
          cloud base above the ground level.
        </p>
        <p>
          The color scale is shown on the bottom left of the screen.
        </p>
      </>
    );

    const thermalVelocityLayer = new Layer(
      thermalVelocityKey,
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

    const windScaleEl: JSX.Element =
      <Show when={!stateProvider.state.windNumericValuesShown}>
        <div>
          {
            [2.5, 5, 10, 17.5, 25].map((windSpeed) => {
              const canvas = <canvas style={{ width: '30px', height: '20px', border: 'thin solid black' }} /> as HTMLCanvasElement;
              canvas.width = 30;
              canvas.height = 20;
              const ctx = canvas.getContext('2d');
              if (ctx === null) { return }
              drawWindArrow(ctx, canvas.width / 2, canvas.height / 2, canvas.width - 4, windColor(0.50), windSpeed, 0, false);
              return (
                <div style={{ 'margin-bottom': '2px' }}>
                  <div>{`${windSpeed} km/h `}</div>
                  {canvas}
                </div>
              )
            })
          }
        </div>
      </Show>;

    const reactiveWindHelp = windHelp(() => stateProvider.state.windNumericValuesShown);
    
    const surfaceWindLayer = new Layer(
      surfaceWindKey,
      'Surface',
      'Wind force and direction on the ground',
      forecast => new Wind(forecast, (point) => [point.uSurfaceWind, point.vSurfaceWind], stateProvider),
      windScaleEl,
      reactiveWindHelp
    );
    
    const _300MAGLWindLayer = new Layer(
      _300MAGLWindKey,
      '300 m AGL',
      'Wind force and direction at 300 m above the ground level',
      forecast => new Wind(forecast, (forecast) => [forecast.u300MWind, forecast.v300MWind], stateProvider),
      windScaleEl,
      reactiveWindHelp
    );
    
    const boundaryLayerWindLayer = new Layer(
      boundaryLayerWindKey,
      'Boundary Layer',
      'Average wind force and direction in the boundary layer',
      forecast => new Wind(forecast, (point) => [point.uWind, point.vWind], stateProvider),
      windScaleEl,
      reactiveWindHelp
    );
    
    const boundaryLayerTopWindLayer = new Layer(
      boundaryLayerTopWindKey,
      'Boundary Layer Top',
      'Wind force and direction at the top of the boundary layer',
      forecast => new Wind(forecast, (point) => [point.uBLTopWind, point.vBLTopWind], stateProvider),
      windScaleEl,
      reactiveWindHelp
    );

    const cloudCoverLayer = new Layer(
      cloudCoverKey,
      'Cloud Cover',
      'Cloud cover (all altitudes)',
      forecast => new CloudCover(forecast),
      colorScaleEl(cloudCoverColorScale, value => `${value}% `),
      <p>
        The cloud cover is a value between 0% and 100% that tells us how much of the
        sunlight will be blocked by the clouds. A low value means a blue sky, and a
        high value means a dark sky.
      </p>
    );

    const cumuliDepthLayer = new Layer(
      cumuliDepthKey,
      'Cumulus Clouds',
      'Cumulus clouds depth',
      forecast => new CumuliDepth(forecast),
      colorScaleEl(cumuliDepthColorScale, value => `${value} m `),
      <>
        <p>
          Cumulus clouds are clouds caused by thermal activity. No cumulus clouds
          means no thermals or blue thermals. Deep cumulus clouds means there is
          risk of overdevelopment.
        </p>
        <p>The color scale is shown on the bottom left of the screen.</p>
      </>
    );

    const rainLayer = new Layer(
      rainKey,
      'Rain',
      'Total rain',
      forecast => new Rain(forecast),
      colorScaleEl(rainColorScale, value => `${value} mm `),
      <p>The color scale is shown on the bottom left of the screen.</p>
    );
    
    const noLayer = new Layer(
      noneKey,
      'None',
      'Map only',
      forecast => new None(forecast),
      <div />,
      <p>This layer just shows the map.</p>
    );    
    
    const allLayers =
      [
        noLayer,
        this.xcFlyingPotentialLayer,
        boundaryLayerDepthLayer,
        thermalVelocityLayer,
        cloudCoverLayer,
        cumuliDepthLayer,
        rainLayer,
        surfaceWindLayer,
        _300MAGLWindLayer,
        boundaryLayerWindLayer,
        boundaryLayerTopWindLayer
      ];

    // Exhaustive mapping from all the keys to their corresponding layer
    this.layersByKey = new Map(allLayers.map(layer => [layer.key, layer]));
  }

  layerByKey(key: string): Layer | undefined {
    return this.layersByKey.get(key);
  }

}
