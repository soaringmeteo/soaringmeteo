import { LocationForecasts, DetailedForecast } from '../data/LocationForecasts';
import { drawWindArrow, lightningShape } from '../shapes';
import {
  Diagram,
  Scale,
  boundaryLayerStyle,
  computeElevationLevels,
  skyStyle,
  temperaturesRange,
  setupCanvas
} from './Diagram';
import { colorScale as thqColorScale } from '../layers/ThQ';
import { drawCloudCover } from './Clouds';
import { createEffect, JSX } from 'solid-js';
import {diagramsAvailableHeight, keyWidth, meteogramColumnWidth} from '../styles/Styles';
import { State } from '../State';
import { thermalVelocityColorScale } from '../layers/ThermalVelocity';
import { inversionStyle } from '../shared';

/**
 * @return [left key element, [meteogram element, right key element]]
 */
export const meteogram = (forecasts: LocationForecasts, state: State): { key: JSX.Element, view: JSX.Element } => {

  const flatForecasts: Array<DetailedForecast> =
    forecasts.dayForecasts.map(x => x.forecasts).reduce((x, y) => x.concat(y), []); // Alternative to flatMap
  const maxBoundaryLayerDepth =
    flatForecasts.reduce((x, forecast) => Math.max(x, forecast.boundaryLayer.depth), -Infinity);

  // In the air diagram, show 1000 meters above the boundary layer depth, and at least 2000 meters above the ground level
  const airDiagramHeightAboveGroundLevel = Math.max(2000, maxBoundaryLayerDepth + 1000 /* meters */);

  const gutterHeight = 5; // px

  // Our meteogram is made of five diagrams stacked on top of each other.
  // The first one shows the ThQ
  // The second one shows the thermal velocity
  // The third one shows the cloud cover for high-level clouds (above 5000 m).
  // The fourth one shows the boundary layer, wind, and middle-level clouds.
  // The fifth one shows rainfalls and ground temperature.

  const thqDiagramHeight = 20; // px
  const thqDiagramTop    = gutterHeight;

  const thermalVelocityDiagramHeight = 20; // px
  const thermalVelocityDiagramTop    = thqDiagramTop + thqDiagramHeight + gutterHeight;

  const highAirDiagramHeight = 20; // px
  const highAirDiagramTop    = thermalVelocityDiagramTop + thermalVelocityDiagramHeight + 11 /* There needs to be enough space in case we display the isotherm 0°C */;

  const rainDiagramHeight = 60; // px

  // Adjust the height of the air diagram depending on the available height
  // Find the number of entries that will be shown in the diagram
  const numberOfEntries =
    // We assume that all the forecasts have similar density of information
    flatForecasts[0].aboveGround
      .findIndex(aboveGround => aboveGround.elevation > forecasts.elevation + airDiagramHeightAboveGroundLevel);
  // The preferred height is the height where the density of information is optimal
  const airDiagramPreferredHeight =
    (numberOfEntries >= 0 ? numberOfEntries : flatForecasts[0].aboveGround.length) * meteogramColumnWidth;
  const airDiagramAvailableHeight = diagramsAvailableHeight - highAirDiagramHeight - thermalVelocityDiagramHeight - thqDiagramHeight - rainDiagramHeight - 11 - gutterHeight * 7; // px
  // If possible, use the preferred height, but if there is not enough space (e.g. on small screens), take the available height
  const airDiagramHeight = Math.min(airDiagramPreferredHeight, airDiagramAvailableHeight);
  const airDiagramTop    = highAirDiagramTop + highAirDiagramHeight; // No gutter between high air diagram and air diagram

  const rainDiagramTop    = airDiagramTop + airDiagramHeight + gutterHeight * 4;

  const canvasWidth   = meteogramColumnWidth * forecasts.dayForecasts.reduce((n, forecast) => n + forecast.forecasts.length, 0);
  const canvasHeight  = rainDiagramTop + rainDiagramHeight + gutterHeight;
  const canvas = document.createElement('canvas');
  setupCanvas(canvas, canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  const canvasLeftKey = document.createElement('canvas');
  setupCanvas(canvasLeftKey, keyWidth, canvasHeight);
  canvasLeftKey.style.flex = '0 0 auto';
  const leftKeyCtx = canvasLeftKey.getContext('2d');

  const canvasRightKey = document.createElement('canvas');
  setupCanvas(canvasRightKey, keyWidth, canvasHeight)
  canvasRightKey.style.flex = '0 0 auto';
  const rightKeyCtx = canvasRightKey.getContext('2d');

  if (ctx !== null && forecasts.dayForecasts.length !== 0 && leftKeyCtx !== null && rightKeyCtx !== null) {

    // setTimeout is necessary to avoid NS_ERROR_FAILURE on some devices
    setTimeout(
      () => {
        createEffect(() => {
          drawMeteogram(
            ctx,
            leftKeyCtx,
            rightKeyCtx,
            forecasts,
            flatForecasts,
            thqDiagramTop,
            thqDiagramHeight,
            thermalVelocityDiagramTop,
            thermalVelocityDiagramHeight,
            highAirDiagramTop,
            highAirDiagramHeight,
            airDiagramTop,
            airDiagramHeight,
            airDiagramHeightAboveGroundLevel,
            rainDiagramTop,
            rainDiagramHeight,
            canvasWidth,
            canvasHeight,
            state.windNumericValuesShown
          );
        });
      },
      0
    );

  }

  return {
    key: canvasLeftKey,
    view: [canvas, canvasRightKey]
  }

}

const drawMeteogram = (
  ctx: CanvasRenderingContext2D,
  leftCtx: CanvasRenderingContext2D,
  rightCtx: CanvasRenderingContext2D,
  forecasts: LocationForecasts,
  flatForecasts: Array<DetailedForecast>,
  thqDiagramTop: number,
  thqDiagramHeight: number,
  thermalVelocityDiagramTop: number,
  thermalVelocityDiagramHeight: number,
  highAirDiagramTop: number,
  highAirDiagramHeight: number,
  airDiagramTop: number,
  airDiagramHeight: number,
  airDiagramHeightAboveGroundLevel: number,
  rainDiagramTop: number,
  rainDiagramHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  windNumericValuesShown: boolean
): void => {

  // Clear everything first
  ctx.save();
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.restore();
  leftCtx.save();
  leftCtx.fillStyle = 'white';
  leftCtx.fillRect(0, 0, keyWidth, canvasHeight);
  leftCtx.restore();
  rightCtx.save();
  rightCtx.fillStyle = 'white';
  rightCtx.fillRect(0, 0, keyWidth, canvasHeight);
  rightCtx.restore();

  const pressureScale     = new Scale([990, 1035 /* hPa */], [0, airDiagramHeight], false);
  const pressureLevels    = [990, 999, 1008, 1017, 1026, 1035];
  const pressureStyle     = '#CD5C5C'

  // The main diagram shows the air from the ground level to “airDiagramHeightAboveGroundLevel”
  const middleCloudsTop  = forecasts.elevation + airDiagramHeightAboveGroundLevel; // m
  // The high air diagram shows the air in the next 1500 meters above the middle clouds top and then higher up
  const highCloudsBottom = middleCloudsTop + 1500; // m
  const elevationScale  = new Scale([forecasts.elevation, middleCloudsTop], [0, airDiagramHeight], false);
  const elevationLevels = computeElevationLevels(forecasts.elevation, 500 /* m */, middleCloudsTop);

  const rainDiagramResolution = 3; // Number of horizontal lines in the rain diagram
  const rainStyle           = 'blue';
  const convectiveRainStyle = 'cyan';
  const maxRainLevel        = 15; // mm
  const minRainLevel        = 0;  // mm
  const rainLevelDelta      = maxRainLevel - minRainLevel;
  const rainScale           = new Scale([minRainLevel, maxRainLevel], [0, rainDiagramHeight], false);
  const rainLevels          = Array.from({ length: rainDiagramResolution }, (_, i) => minRainLevel + rainLevelDelta * i / rainDiagramResolution);

  const [minTemperature, maxTemperature] = temperaturesRange(
    flatForecasts.map(_ => _.surface.dewPoint),
    flatForecasts.map(_ => _.surface.temperature)
  );
  // Make sure horizontal divisions are whole numbers
  const temperatureDelta  = Math.ceil((maxTemperature - minTemperature) / rainDiagramResolution) * rainDiagramResolution;
  const temperatureScale  = new Scale([minTemperature, minTemperature + temperatureDelta], [0, rainDiagramHeight], false);
  const temperatureLevels = Array.from({ length: rainDiagramResolution }, (_, i) => minTemperature + temperatureDelta * i / 3);
  const temperatureStyle  = 'black';

  const columns = (drawColumn: (forecast: DetailedForecast, columnStart: number, columnEnd: number, date: Date) => void): void => {
    flatForecasts.forEach((forecast, i) => {
      const columnStart = i * meteogramColumnWidth;
      const columnEnd   = columnStart + meteogramColumnWidth;
      drawColumn(forecast, columnStart, columnEnd, forecast.time);
    });
  }

  // ThQ diagram
  const thqDiagram = new Diagram([0, thqDiagramTop], thqDiagramHeight, ctx);

  columns((forecast, columnStart, columnEnd) => {
    const thq = forecast.xcPotential;
    thqDiagram.fillRect(
      [columnStart, 0],
      [columnEnd, thqDiagramHeight],
      `${thqColorScale.closest(thq).css()}`
    );
    thqDiagram.rect(
      [columnStart, 0],
      [columnEnd, thqDiagramHeight],
      'dimgray'
    )
    thqDiagram.text(`${thq}`, [columnStart + meteogramColumnWidth / 2, 6], thq >= 20 ? 'dimgray' : '#989898', 'center');
  });

  // Thermal velocity diagram
  const thermalVelocityDiagram = new Diagram([0, thermalVelocityDiagramTop], thermalVelocityDiagramHeight, ctx);

  columns((forecast, columnStart, columnEnd) => {
    thermalVelocityDiagram.fillRect(
      [columnStart, 0],
      [columnEnd, thermalVelocityDiagramHeight],
      `${thermalVelocityColorScale.closest(forecast.thermalVelocity).css()}`
    );
    thermalVelocityDiagram.rect(
      [columnStart, 0],
      [columnEnd, thermalVelocityDiagramHeight],
      'dimgray'
    );
    thermalVelocityDiagram.text(
      `${forecast.thermalVelocity.toFixed(1)}`, [columnStart + meteogramColumnWidth / 2, 6],
      forecast.thermalVelocity >= 0.5 ? 'dimgray' : '#989898',
      'center'
    );
  });

  // High altitude air diagram
  const highAirDiagram = new Diagram([0, highAirDiagramTop], highAirDiagramHeight, ctx);

  columns((forecast, columnStart, columnEnd) => {

    const columnCenter = (columnStart + columnEnd) / 2;

    // Blue sky
    highAirDiagram.fillRect(
      [columnStart, 0],
      [columnEnd,   highAirDiagramHeight],
      skyStyle
    );

    // Clouds above middleCloudsTop
    const middleCloudCover =
      Math.max(
        ...forecast.aboveGround
          .filter(aboveGround => aboveGround.elevation >= middleCloudsTop && aboveGround.elevation < highCloudsBottom)
          .map(aboveGround => aboveGround.cloudCover)
      );
    drawCloudCover(
      highAirDiagram,
      meteogramColumnWidth,
      middleCloudCover,
      columnCenter,
      0,
      highAirDiagramHeight / 2
    );

    const highCloudCover =
      Math.max(
        ...forecast.aboveGround
          .filter(aboveGround => aboveGround.elevation >= highCloudsBottom)
          .map(aboveGround => aboveGround.cloudCover)
      );
    // High-level clouds
    drawCloudCover(
      highAirDiagram,
      meteogramColumnWidth,
      highCloudCover,
      columnCenter,
      highAirDiagramHeight / 2,
      highAirDiagramHeight
    );
  });

  // Air diagram
  const airDiagram = new Diagram([0, airDiagramTop], airDiagramHeight, ctx);

  // Ground level & Boundary Layer
  columns((forecast, columnStart, columnEnd) => {
    // Boundary Layer
    const cappedBoundaryLayerDepth = Math.min(forecast.boundaryLayer.depth, airDiagramHeightAboveGroundLevel); // Clip boundary layer in case it’s too high
    const boundaryLayerHeight = elevationScale.apply(forecasts.elevation + cappedBoundaryLayerDepth);
    // Blue sky
    airDiagram.fillRect(
      [columnStart, boundaryLayerHeight],
      [columnEnd,   airDiagramHeight],
      skyStyle
    )
    // Stable layers
    forecast.aboveGround
      .filter(aboveGround => aboveGround.elevation < middleCloudsTop)
      .reduce<[number, number]>(
        ([previousElevation, previousTemperature], aboveGround) => {
          const lapseRate = (aboveGround.temperature - previousTemperature) / ((aboveGround.elevation - previousElevation) / 100);
          // Inversion
          if (lapseRate >= 0) {
            airDiagram.fillRect(
              [columnStart, elevationScale.apply(previousElevation)],
              [columnEnd,   elevationScale.apply(aboveGround.elevation)],
              inversionStyle
            );
          }
          return [aboveGround.elevation, aboveGround.temperature]
        },
        [forecasts.elevation, forecast.surface.temperature]
      );
    // Boundary layer
    airDiagram.fillRect(
      [columnStart, 0],
      [columnEnd,   boundaryLayerHeight],
      boundaryLayerStyle
    );
  });

  // Clouds
  columns((forecast, columnStart, columnEnd) => {

    // Cumulus Clouds
    if (forecast.boundaryLayer.cumulusClouds !== undefined && forecast.boundaryLayer.cumulusClouds.bottom < airDiagramHeightAboveGroundLevel) {
      airDiagram.cumulusCloud(
        [columnStart, elevationScale.apply(forecast.boundaryLayer.cumulusClouds.bottom + forecasts.elevation)],
        [columnEnd,   elevationScale.apply(forecast.boundaryLayer.depth + forecasts.elevation)]
      );
    }

    const columnCenter = (columnStart + columnEnd) / 2;
    const [lastCloudBottomY, maybeLastElevationAndCloudCover] =
      forecast.aboveGround
        // Keep only entries that are below the middle clouds top
        .filter((aboveGround) => aboveGround.elevation < middleCloudsTop)
        .reduce<[number, [number, number] | undefined]>(
          ([cloudBottomY, maybePreviousElevationAndCloudCover], aboveGround) => {
            const elevationY = elevationScale.apply(aboveGround.elevation);
            if (maybePreviousElevationAndCloudCover === undefined) {
              return [cloudBottomY, [elevationY, aboveGround.cloudCover]]
            } else {
              const [previousElevationY, previousCloudCover] = maybePreviousElevationAndCloudCover;
              const cloudTopY = (elevationY + previousElevationY) / 2;
              drawCloudCover(
                airDiagram,
                meteogramColumnWidth,
                previousCloudCover,
                columnCenter,
                cloudBottomY,
                cloudTopY
              );
              return [cloudTopY, [elevationY, aboveGround.cloudCover]]
            }
          },
          [elevationScale.apply(forecasts.elevation), undefined]
        );
    if (maybeLastElevationAndCloudCover !== undefined) {
      const [_, lastCloudCover] = maybeLastElevationAndCloudCover;
      drawCloudCover(
        airDiagram,
        meteogramColumnWidth,
        lastCloudCover,
        columnCenter,
        lastCloudBottomY,
        elevationScale.apply(middleCloudsTop)
      );
    }
  });

  // Wind
  columns((forecast, columnStart, _) => {
    const windCenterX = columnStart + meteogramColumnWidth / 2;
    const windColor = `rgba(62, 0, 0, ${ windNumericValuesShown ? 0.5 : 0.25 })`;
    const windArrowSize = meteogramColumnWidth - 12;
    let windArrowY = elevationScale.apply(forecasts.elevation + 5 /* meters */);
    // Surface wind
    drawWindArrow(ctx, windCenterX, airDiagram.projectY(windArrowY), windArrowSize, windColor, forecast.surface.wind.u, forecast.surface.wind.v, windNumericValuesShown);
    // Air wind
    forecast.aboveGround
      .filter((entry) => entry.elevation < forecasts.elevation + airDiagramHeightAboveGroundLevel)
      .forEach((wind) => {
        const y = elevationScale.apply(wind.elevation);
        // Show the arrow only if the density of wind arrows is not too high
        if (y - windArrowY >= windArrowSize * 0.5) {
          drawWindArrow(ctx, windCenterX, airDiagram.projectY(y), windArrowSize, windColor, wind.u, wind.v, windNumericValuesShown);
          windArrowY = y;
        }
      });
  });

  // Isotherm 0°C
  if (flatForecasts[0].isothermZero !== undefined) { // If the first forecast defines it, we assume they all define it
    const isothermZeroStyle = 'dimgray';
    flatForecasts
      .reduce((previousForecast, forecast, i) => {
        const previousIsothermZero = previousForecast.isothermZero as number;
        const x = meteogramColumnWidth * (i - 0.5);
        const y = elevationScale.apply(previousIsothermZero);
        let correctedY: number | undefined = undefined;
        if (previousIsothermZero < forecasts.elevation) {
          correctedY = -15;
        } else if (previousIsothermZero > forecasts.elevation + airDiagramHeightAboveGroundLevel) {
          correctedY = airDiagramHeight + highAirDiagramHeight + 1;
        }
        // If first column, print the “0°C” on the left of the line
        if (i == 1) {
          airDiagram.text(
            '0°C',
            correctedY === undefined ? [x - 10, y + 3] : [x - 10, correctedY - 10],
            isothermZeroStyle
          );
        }
        // Draw line
        airDiagram.line(
          [x, y],
          [meteogramColumnWidth * (i + 0.5), elevationScale.apply(forecast.isothermZero as number)],
          isothermZeroStyle,
          undefined,
          true
        );
        // If line is beyond the diagram, print text value
        if (correctedY !== undefined) {
          airDiagram.text(
            `${previousForecast.isothermZero}`,
            [x, correctedY],
            isothermZeroStyle,
            'center'
          );
        }
        return forecast
      });
  }

  // Elevation levels
  elevationLevels.forEach(elevationLevel => {
    const y = elevationScale.apply(elevationLevel);
    airDiagram.line([0, y], [canvasWidth, y], 'gray');
  });

  // Rain diagram
  const rainDiagram = new Diagram([0, rainDiagramTop], rainDiagramHeight, ctx);

  // Thunderstorm risk
  let previousLightningX = 0;
  forecasts.dayForecasts.forEach(forecast => {
    const dayWidth = forecast.forecasts.length * meteogramColumnWidth;
    if (forecast.thunderstormRisk > 0) {
      const lightningMaxWidth = dayWidth / 3;
      const lightningMinWidth = lightningMaxWidth * 3 / 4;
      const width = lightningMinWidth + lightningMaxWidth * (forecast.thunderstormRisk - 1) / 3;
      const x = previousLightningX + dayWidth / 2;
      const y = rainDiagramHeight - width / 2;
      let lightningStyle: string;
      switch (forecast.thunderstormRisk) {
        case 1: lightningStyle = 'yellow'; break
        case 2: lightningStyle = 'orange'; break
        case 3: lightningStyle = 'red'; break
        default: lightningStyle = 'purple'; break
      }
      rainDiagram.fillShape(lightningShape(x, y, width), lightningStyle, 'gray');
    }
    previousLightningX = previousLightningX + dayWidth;
  });

  // Rain
  columns((forecast, columnStart, columnEnd) => {
    rainDiagram.fillRect(
      [columnStart, 0],
      [columnEnd,   rainScale.apply(forecast.rain.convective)],
      convectiveRainStyle
    );
    rainDiagram.fillRect(
      [columnStart, rainScale.apply(forecast.rain.convective)],
      [columnEnd,   rainScale.apply(forecast.rain.total)],
      rainStyle
    );
  });

  // QNH, temperature, and humidity
  flatForecasts
    .reduce(
      (previousForecast, forecast, i) => {
        const x1 = meteogramColumnWidth * (i - 0.5);
        const x2 = meteogramColumnWidth * (i + 0.5)
        airDiagram.line(
          [x1, pressureScale.apply(previousForecast.meanSeaLevelPressure)],
          [x2, pressureScale.apply(forecast.meanSeaLevelPressure)],
          pressureStyle
        );
        rainDiagram.line(
          [x1, temperatureScale.apply(previousForecast.surface.temperature)],
          [x2, temperatureScale.apply(forecast.surface.temperature)],
          'red'
        );
        rainDiagram.line(
          [x1, temperatureScale.apply(previousForecast.surface.dewPoint)],
          [x2, temperatureScale.apply(forecast.surface.dewPoint)],
          'blue'
        );
        return forecast
      }
    );

  // Rain levels
  rainLevels.forEach(rainMillimeters => {
    const y = rainScale.apply(rainMillimeters);
    rainDiagram.line([0, y], [canvasWidth, y], 'gray');
  });

  // Day separation lines
  let previousDay: number | undefined = undefined;
  columns((forecast, columnStart, columnEnd, date) => {
    const currentDay = date.getDay(); // FIXME Users can’t use a custom timezone
    if (previousDay !== currentDay) {
      highAirDiagram.line([columnStart, 0], [columnStart, highAirDiagramHeight], 'gray');
      airDiagram.line([columnStart, 0], [columnStart, airDiagramHeight], 'gray');
      rainDiagram.line([columnStart, 0], [columnStart, rainDiagramHeight], 'gray');
    }
    previousDay = currentDay;
  })

  // --- Left key

  // Thq
  const leftThqDiagram = new Diagram([0, thqDiagramTop], thqDiagramHeight, leftCtx);
  leftThqDiagram.text('XC?', [keyWidth / 2, 8], 'black', 'center', 'middle');

  // Thermal velocity
  const leftThermalVelocityDiagram = new Diagram([0, thermalVelocityDiagramTop], thermalVelocityDiagramHeight, leftCtx);
  leftThermalVelocityDiagram.text('m/s', [keyWidth / 2, 8], 'black', 'center', 'middle');

  // High air diagram
  const leftHighAirDiagram = new Diagram([0, highAirDiagramTop], highAirDiagramHeight, leftCtx);
  leftHighAirDiagram.line(
    [keyWidth - leftCtx.lineWidth, 0],
    [keyWidth - leftCtx.lineWidth, highAirDiagramHeight],
    'black',
    [5, 3]
  );

  // Elevation
  const leftAirDiagram = new Diagram([0, airDiagramTop], airDiagramHeight, leftCtx);
  leftAirDiagram.line(
    [keyWidth - leftCtx.lineWidth, 0],
    [keyWidth - leftCtx.lineWidth, airDiagramHeight],
    'black'
  );
  leftAirDiagram.text('m', [keyWidth - 5, airDiagramHeight - 15], 'black', 'right', 'middle');

  elevationLevels.forEach(elevationLevel => {
    const y = elevationScale.apply(elevationLevel);
    leftAirDiagram.line(
      [keyWidth - 8, y],
      [keyWidth,     y],
      'black'
    );
    leftAirDiagram.text(`${Math.round(elevationLevel)}`, [keyWidth - 10, y], 'black', 'right', 'middle');
  });

  // Rain
  const leftRainDiagram = new Diagram([0, rainDiagramTop], rainDiagramHeight, leftCtx);
  leftRainDiagram.line(
    [keyWidth - leftCtx.lineWidth, 0],
    [keyWidth - leftCtx.lineWidth, rainDiagramHeight],
    rainStyle
  );
  leftRainDiagram.text('mm', [keyWidth - 5, rainDiagramHeight], rainStyle, 'right', 'middle');

  rainLevels.forEach(rainMillimeters => {
    const y = rainScale.apply(rainMillimeters);
    leftRainDiagram.line(
      [keyWidth - 8, y],
      [keyWidth, y],
      rainStyle
    );
    leftRainDiagram.text(`${rainMillimeters}`, [keyWidth - 10, y], rainStyle, 'right', 'middle');
  });

  // --- Right key

  // Temperature
  const rightRainDiagram = new Diagram([0, rainDiagramTop], rainDiagramHeight, rightCtx);
  rightRainDiagram.line(
    [0, 0],
    [0, rainDiagramHeight],
    temperatureStyle
  );
  rightRainDiagram.text('°C', [5, rainDiagramHeight], temperatureStyle, 'left', 'middle');

  temperatureLevels.forEach(temperatureDegrees => {
    const y = temperatureScale.apply(temperatureDegrees);
    rightRainDiagram.line(
      [0, y],
      [8, y],
      temperatureStyle
    );
    rightRainDiagram.text(`${temperatureDegrees}`, [10, y], temperatureStyle, 'left', 'middle');
  });

  // Pressure
  const rightAirDiagram = new Diagram([0, airDiagramTop], airDiagramHeight, rightCtx);
  rightAirDiagram.line(
    [0, 0],
    [0, airDiagramHeight],
    pressureStyle
  );
  rightAirDiagram.text('hPa', [5, airDiagramHeight - 15], pressureStyle, 'left', 'middle');
  pressureLevels.forEach(pascals => {
    const y = pressureScale.apply(pascals);
    rightAirDiagram.line(
      [0, y],
      [8, y],
      pressureStyle
    );
    rightAirDiagram.text(`${pascals}`, [10, y], pressureStyle, 'left', 'middle');
  });

};
