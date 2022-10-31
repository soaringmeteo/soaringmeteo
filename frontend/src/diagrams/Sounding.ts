import { Diagram, Scale, boundaryLayerStyle, computeElevationLevels, nextValue, previousValue, skyStyle, temperaturesRange } from './Diagram';
import { DetailedForecast } from "../data/Forecast";
import { cloudsColorScale } from './Clouds';
import { drawWindArrow } from '../shapes';
import { JSX } from 'solid-js';
import { keyWidth, soundingWidth } from '../styles/Styles';

const temperatureScaleAndLevels = (forecast: DetailedForecast, pixelRange: [number, number]): [Scale, Array<number>] => {

  const [minTemperature, maxTemperature] = temperaturesRange(
    forecast.aboveGround.map(_ => _.dewPoint).concat([forecast.surface.dewPoint]),
    forecast.aboveGround.map(_ => _.temperature).concat([forecast.surface.temperature])
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

export const sounding = (forecast: DetailedForecast, elevation: number): { key: JSX.Element, view: JSX.Element } => {
  const availableHeight = window.innerHeight - 38 /* top time selector */ - 50 /* bottom time selector */;
  const maxHeight = 800;
  const canvasHeight = Math.min(maxHeight, availableHeight);
  const windArrowSize = Math.max(canvasHeight / 28, 1);

  // Main canvas contains the sounding diagram
  const canvas = document.createElement('canvas');
  canvas.setAttribute('width', `${soundingWidth}`);
  canvas.setAttribute('height', `${canvasHeight}`);
  canvas.style.width = `${soundingWidth}px`;
  canvas.style.height = `${canvasHeight}px`;
  const ctx = canvas.getContext('2d');

  // Left key contains the vertical axis of the sounding diagram
  const canvasLeftKey = document.createElement('canvas');
  canvasLeftKey.setAttribute('width', `${keyWidth}`);
  canvasLeftKey.setAttribute('height', `${canvasHeight}`);
  canvasLeftKey.style.width = `${keyWidth}px`;
  canvasLeftKey.style.height = `${canvasHeight}px`;
  canvasLeftKey.style.flex = '0 0 auto';
  const leftCtx = canvasLeftKey.getContext('2d');

  // Offset between the edge of the canvas and the edge of the diagram
  // This offset let’s us write the axes names
  const offset     = 16;
  const textOffset = offset / 2;

  // Dimensions of the sounding diagram
  const width  = soundingWidth;
  const height = canvasHeight - 5;

  const maxElevation    = 12000; // m
  const elevationScale  = new Scale([elevation, maxElevation], [offset, height], false);

  const [temperatureScale, temperatureLevels] = temperatureScaleAndLevels(forecast, [0, width]);

  if (ctx !== null && leftCtx !== null) {

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
      forecast.aboveGround
        .filter(aboveGround => aboveGround.elevation > elevation && aboveGround.elevation < maxElevation)
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

    // --- Sounding Diagram

    forecast.aboveGround
      .reduce(([previousTemperature, previousDewPoint, previousElevation], entry) => {
        const y0 = elevationScale.apply(previousElevation);
        const y1 = elevationScale.apply(entry.elevation);

        // Wind
        if (temperatureLevels.length >= 2 && entry.elevation < maxElevation) {
          const windCenterX = temperatureScale.apply(temperatureLevels[0]);
          drawWindArrow(ctx, windCenterX, diagram.projectY(y1), windArrowSize, `rgba(62, 0, 0, 0.25)`, entry.u, entry.v);
        }

        // Temperature
        // Note: this is approximate, see https://en.wikipedia.org/wiki/Lapse_rate
        // We should consider applying the most precise formulas
        const lapseRate = (entry.temperature - previousTemperature) / ((entry.elevation - previousElevation) / 100);
        diagram.line(
          [temperatureScale.apply(previousTemperature), y0],
          [temperatureScale.apply(entry.temperature), y1],
          'black',
          undefined,
          true,
          // Decrease line width according to the stability of the air mass
          lapseRate <= -1 ? 4 : (lapseRate <= -0.6 ? 3 : (lapseRate < 0 ? 2 : 1))
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

  }
  return { key: canvasLeftKey, view: canvas }
}
