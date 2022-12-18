import { Diagram, Scale, boundaryLayerStyle, computeElevationLevels, nextValue, previousValue, skyStyle, temperaturesRange } from './Diagram';
import { AboveGround, DetailedForecast } from "../data/Forecast";
import { cloudsColorScale } from './Clouds';
import { drawWindArrow } from '../shapes';
import { createEffect, createSignal, JSX } from 'solid-js';
import { keyWidth, soundingWidth, surfaceOverMap } from '../styles/Styles';

const temperatureScaleAndLevels = (
  aboveGround: Array<AboveGround>,
  surfaceTemperature: number,
  surfaceDewPoint: number,
  pixelRange: [number, number]
): [Scale, Array<number>] => {

  const [minTemperature, maxTemperature] = temperaturesRange(
    aboveGround.map(_ => _.dewPoint).concat([surfaceDewPoint]),
    aboveGround.map(_ => _.temperature).concat([surfaceTemperature])
  );
  
  const step = 10;
  const minTemperatureRounded = previousValue(minTemperature, step);
  const maxTemperatureRounded = nextValue(maxTemperature, step);

  const levels = [];
  let nextLevel = minTemperatureRounded + step;
  while (nextLevel < maxTemperatureRounded) {
    levels.push(nextLevel);
    nextLevel = nextLevel + step;
  }

  const scale = new Scale([minTemperatureRounded, maxTemperatureRounded], pixelRange, false);
  return [scale, levels]
}

export const sounding = (forecast: DetailedForecast, elevation: number, zoomedDefaultValue: boolean): { key: JSX.Element, view: JSX.Element } => {

  const [canvasHeight, _] = computeSoundingHeightAndMaxElevation(zoomedDefaultValue, elevation, forecast);

  // Main canvas contains the sounding diagram
  const canvas = document.createElement('canvas');
  canvas.style.width = `100%`;
  canvas.style.height = `100%`;
  canvas.setAttribute('width', `${soundingWidth}`);
  canvas.setAttribute('height', `${canvasHeight}`);
  const ctx = canvas.getContext('2d');

  // Left key contains the vertical axis of the sounding diagram
  const canvasLeftKey = document.createElement('canvas');
  canvasLeftKey.setAttribute('width', `${keyWidth}`);
  canvasLeftKey.setAttribute('height', `${canvasHeight}`);
  canvasLeftKey.style.width = `${keyWidth}px`;
  canvasLeftKey.style.height = `${canvasHeight}px`;
  canvasLeftKey.style.flex = '0 0 auto';
  const leftCtx = canvasLeftKey.getContext('2d');

  const [zoomed, zoom] = createSignal(zoomedDefaultValue);

  const zoomButton = <div
    style={{
      position: 'absolute',
      top: `10px`,
      right: `5px`,
      width: `32px`,
      height: `32px`,
      cursor: `pointer`,
      'text-align': `center`,
      'background-color': 'lightGray',
      ...surfaceOverMap,
      'border-radius': '16px'
    }}
    onClick={ () => zoom(!zoomed()) }
    title={ zoomed() ? 'Zoom out' : 'Zoom in' }
  >
    <div style={{
      display: 'inline-block',
      width: '10px',
      height: '10px',
      'margin-top': '16px',
      'margin-bottom': '16px',
      'border-top': '2px solid black',
      'border-right': '2px solid black',
      transform: zoomed() ? 'translateY(-50%) rotate(-45deg)' : 'translateY(-50%) rotate(135deg)'
      }} />
  </div>;

  const view = <div
    style={{
      position: `relative`,
      display: `inline-block`
    }}
  >
    { canvas }
    { zoomButton }
  </div>;

  if (ctx !== null && leftCtx !== null) {

    // Necessary to avoid NS_ERROR_FAILURE on some devices
    setTimeout(
      () => {
        createEffect(() => {
          drawSounding(
            view,
            canvas,
            ctx,
            canvasLeftKey,
            leftCtx,
            forecast,
            elevation,
            zoomed()
          );
        })
      },
      0
    );

  }
  return { key: canvasLeftKey, view }
};

const drawSounding = (
  rootView: HTMLElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  canvasLeftKey: HTMLCanvasElement,
  leftCtx: CanvasRenderingContext2D,
  forecast: DetailedForecast,
  elevation: number,
  zoomed: boolean
): void => {
  const [canvasHeight, maxElevation] =
    computeSoundingHeightAndMaxElevation(zoomed, elevation, forecast);

  rootView.style.width = `${soundingWidth}px`;
  rootView.style.height = `${canvasHeight}px`;

  canvas.setAttribute('width', `${soundingWidth}`);
  canvas.setAttribute('height', `${canvasHeight}`);
  canvasLeftKey.setAttribute('height', `${canvasHeight}`);
  canvasLeftKey.style.height = `${canvasHeight}px`;

  // Clear everything first
  ctx.save();
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, soundingWidth, canvasHeight);
  ctx.restore();
  leftCtx.save();
  leftCtx.fillStyle = 'white';
  leftCtx.fillRect(0, 0, keyWidth, canvasHeight);
  leftCtx.restore();

  // Offset between the edge of the canvas and the edge of the diagram
  // This offset let’s us write the axes names
  const offset     = 16;
  const textOffset = offset / 2;

  // Dimensions of the sounding diagram
  const width  = soundingWidth;
  const height = canvasHeight - 5;

  const elevationScale = new Scale([elevation, maxElevation], [offset, height], false);

  let indexOfFirstDataAboveMaxElevation = 0;
  while (
    indexOfFirstDataAboveMaxElevation < forecast.aboveGround.length
      && forecast.aboveGround[indexOfFirstDataAboveMaxElevation].elevation < maxElevation
  ) {
    indexOfFirstDataAboveMaxElevation += 1;
  }
  if (indexOfFirstDataAboveMaxElevation < forecast.aboveGround.length) {
    indexOfFirstDataAboveMaxElevation += 1;
  }

  // Remove points that are above the max elevation level
  const relevantData = forecast.aboveGround.slice(0, indexOfFirstDataAboveMaxElevation + 1);

  const [temperatureScale, temperatureLevels] = temperatureScaleAndLevels(
    relevantData,
    forecast.surface.temperature,
    forecast.surface.dewPoint,
    [0, width]
  );

  const diagram     = new Diagram([0, 5], height, ctx);
  const leftDiagram = new Diagram([0, 5], height, leftCtx);
  // --- Background

  // Sky and boundary layer
  diagram.fillRect(
    [0, elevationScale.apply(elevation)],
    [width, elevationScale.apply(elevation + forecast.boundaryLayer.height)],
    boundaryLayerStyle
  );
  diagram.fillRect(
    [0, elevationScale.apply(elevation + forecast.boundaryLayer.height)],
    [width, elevationScale.apply(maxElevation)],
    skyStyle
  );

  // Clouds
  const [lastCloudBottom, maybeLastElevationAndCloudCover] =
    relevantData
      .reduce<[number, [number, number] | undefined]>(
        ([cloudBottom, maybePreviousElevationAndCloudCover], aboveGround) => {
          if (maybePreviousElevationAndCloudCover === undefined) {
            return [cloudBottom, [aboveGround.elevation, aboveGround.cloudCover]]
          } else {
            const [previousElevation, previousCloudCover] = maybePreviousElevationAndCloudCover;
            const cloudTop = (aboveGround.elevation + previousElevation) / 2;
            diagram.fillRect(
              [0, elevationScale.apply(cloudBottom)],
              [width, elevationScale.apply(cloudTop)],
              cloudsColorScale.interpolate(previousCloudCover).css()
            );
            return [cloudTop, [aboveGround.elevation, aboveGround.cloudCover]]
          }
        },
        [elevation, undefined]
      );
  if (maybeLastElevationAndCloudCover !== undefined) {
    const [_, lastCloudCover] = maybeLastElevationAndCloudCover;
    diagram.fillRect(
      [0, elevationScale.apply(lastCloudBottom)],
      [width, elevationScale.apply(maxElevation)],
      cloudsColorScale.interpolate(lastCloudCover).css()
    );
  }

  // --- Axes

  // Horizontal axis (°C)
  diagram.line([0, offset], [width, offset], 'black');
  diagram.text('°C', [width - textOffset, textOffset], 'black', 'center', 'middle');
  temperatureLevels.forEach(temperature => {
    const x = temperatureScale.apply(temperature);
    diagram.line(
      [x, offset],
      [x, height],
      'gray'
    );
    diagram.text(`${temperature}`, [x, textOffset], 'black', 'center', 'middle');
  });

  // Vertical axis (m)
  leftDiagram.line(
    [keyWidth - leftCtx.lineWidth, offset],
    [keyWidth - leftCtx.lineWidth, height],
    'black'
  );
  leftDiagram.text('m', [keyWidth - textOffset, height - textOffset], 'black', 'center', 'middle');
  const elevationLevels = computeElevationLevels(elevation, 1000 /* m */, maxElevation);
  elevationLevels.forEach(elevationLevel => {
    const y = elevationScale.apply(elevationLevel);
    diagram.line([0, y], [width, y], 'gray');
    leftDiagram.text(
      `${Math.round(elevationLevel)}`,
      [keyWidth - leftCtx.lineWidth - 3, y],
      'black',
      'right',
      'middle'
    );
  });

  // Print boundary layer height
  diagram.text(
    `${elevation + forecast.boundaryLayer.height}`,
    [2, elevationScale.apply(elevation + forecast.boundaryLayer.height) - 4],
    'black'
  );

  // --- Sounding Diagram

  const windArrowSize = Math.max(Math.min(canvasHeight / (relevantData.length * 1.2), 35), 1);
  relevantData
    .reduce(([previousTemperature, previousDewPoint, previousElevation], entry) => {
      const y0 = elevationScale.apply(previousElevation);
      const y1 = elevationScale.apply(entry.elevation);

      // Wind
      if (temperatureLevels.length >= 2 && entry.elevation < maxElevation) {
        const windCenterX = temperatureScale.apply(temperatureLevels[0]);
        drawWindArrow(ctx, windCenterX, diagram.projectY(y1), windArrowSize, `rgba(62, 0, 0, 0.30)`, entry.u, entry.v);
      }

      // Temperature
      // Note: this is approximate, see https://en.wikipedia.org/wiki/Lapse_rate
      // We should consider applying the most precise formulas
      const lapseRate = (entry.temperature - previousTemperature) / ((entry.elevation - previousElevation) / 100);
      const [color, width] =
        lapseRate <= -1 ?
          ['yellow', 4] :     // absolutely unstable air
          (lapseRate <= -0.5 ?
            ['orange', 3] :   // conditionally unstable air
            (lapseRate < 0 ?
              ['black', 2] :  // stable air
              ['black', 1]    // inversion
            )
          );
      diagram.line(
        [temperatureScale.apply(previousTemperature), y0],
        [temperatureScale.apply(entry.temperature), y1],
        color,
        undefined,
        true,
        width
      );

      // Dew point
      diagram.line(
        [temperatureScale.apply(previousDewPoint), y0],
        [temperatureScale.apply(entry.dewPoint), y1],
        'blue',
        undefined,
        true,
        2
      );

      return [entry.temperature, entry.dewPoint, entry.elevation]
    },
      [forecast.surface.temperature, forecast.surface.dewPoint, elevation]
    );

    // Thermal velocity
    const projectedSurfaceTemperature = temperatureScale.apply(forecast.surface.temperature);
    const projectedElevation = elevationScale.apply(elevation);
    const projectedBoundaryLayerHeight = elevationScale.apply(elevation + forecast.boundaryLayer.height);
    diagram.text(
      `${forecast.thermalVelocity.toFixed(1)} m/s`,
      [projectedSurfaceTemperature, (projectedElevation + projectedBoundaryLayerHeight) / 2],
      'black',
      'right',
      'middle'
    );

};

const computeSoundingHeightAndMaxElevation = (zoomed: boolean, elevation: number, forecast: DetailedForecast): [number, number] => {
  const maxElevation = zoomed ? (elevation + forecast.boundaryLayer.height + 2000) : 12000; // m

  const availableHeight = window.innerHeight - 38 /* top time selector */ - 50 /* bottom time selector */;
  const preferredHeight = (maxElevation - elevation) / 10; // Arbitrary factor to make the diagram visually nice
  const canvasHeight = Math.min(preferredHeight, availableHeight);
  return [canvasHeight, maxElevation];
}
