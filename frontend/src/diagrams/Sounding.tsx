import h from 'solid-js/h';

import { Diagram, Scale, boundaryLayerStyle, columnCloud, computeElevationLevels, nextValue, previousValue, skyStyle, temperaturesRange } from './Diagram';
import { DetailedForecast } from "../data/Forecast";
import { keyWidth } from './Meteogram';
import { drawWindArrow } from '../shapes';
import { JSX } from 'solid-js';

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

export const sounding = (forecast: DetailedForecast, elevation: number): [JSX.Element, JSX.Element] => {
  const canvasWidth  = 600;
  const canvasHeight = 800; // TODO use as much space as possible

  // Main canvas contains the sounding diagram
  const canvas =
    h(
      'canvas',
      {
        width: canvasWidth,
        height: canvasHeight,
        style: { width: `${canvasWidth}px`, height: `${canvasHeight}px` }
      }
    ) as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');

  // Left key contains the vertical axis of the sounding diagram
  const canvasLeftKey =
    h(
      'canvas',
      {
        width: keyWidth,
        height: canvasHeight,
        style: { flex: '0 0 auto', width: `${keyWidth}px`, height: `${canvasHeight}px` }
      }
    ) as HTMLCanvasElement;
  const leftCtx = canvasLeftKey.getContext('2d');

  // Offset between the edge of the canvas and the edge of the diagram
  // This offset let’s us write the axes names
  const offset     = 16;
  const textOffset = offset / 2;

  // Dimensions of the sounding diagram
  const width  = canvasWidth;
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
    // Low-level clouds
    diagram.fillRect(
      [0, elevationScale.apply(elevation)],
      [width, elevationScale.apply(elevation + 2000)],
      `rgba(255, 255, 255, ${ forecast.clouds.lowLevel * 0.7 })`
    );
    // Middle-level clouds (if visible)
    if (elevation + 2000 < 6000) {
      diagram.fillRect(
        [0, elevationScale.apply(elevation + 2000)],
        [width, elevationScale.apply(6000)],
        `rgba(255, 255, 255, ${ forecast.clouds.middleLevel * 0.7 })`
      );
    }
    // High-level clouds
    diagram.fillRect(
      [0, elevationScale.apply(Math.max(elevation + 2000, 6000))],
      [width, elevationScale.apply(maxElevation)],
      `rgba(255, 255, 255, ${ forecast.clouds.highLevel * 0.7 })`
    );
    // Cumuli
    // Cumuli base height is computed via Hennig formula
    const cumuliBase = 122.6 * (forecast.surface.temperature - forecast.surface.dewPoint);
    if (cumuliBase < forecast.boundaryLayer.height) {
      diagram.fillRect(
        [0, elevationScale.apply(elevation + cumuliBase)],
        [width, elevationScale.apply(elevation + forecast.boundaryLayer.height)],
        columnCloud
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
      .sort((a, b) => a.elevation - b.elevation)
      .reduce(([previousTemperature, previousDewPoint, previousElevation], entry) => {
        const y0 = elevationScale.apply(previousElevation);
        const y1 = elevationScale.apply(entry.elevation);

        // Wind
        if (temperatureLevels.length >= 2 && entry.elevation < maxElevation) {
          const windCenterX = temperatureScale.apply(temperatureLevels[0]);
          drawWindArrow(ctx, windCenterX, diagram.projectY(y1), 30, `rgba(62, 0, 0, 0.25)`, entry.u, entry.v);
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
  return [canvasLeftKey, canvas]
}
