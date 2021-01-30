import { el } from 'redom';
import { LocationForecasts, DetailedForecast } from './Forecast';
import { drawWindArrow, lightningShape, cloudPattern } from './shapes';
import { Diagram, Scale } from './Diagram';
import { value as thqValue, colorScale as thqColorScale } from './layers/ThQ';

export const columnWidth = 33;
export const keyWidth = 40;
export const airDiagramHeightAboveGroundLevel = 3500; // m

// Pre-compute cloud pattern
const columnCloud = cloudPattern(columnWidth / 3, 'rgba(255, 255, 255, 0.7)');

/**
 * @return [left key element, meteogram element, right key element]
 */
export const meteogram = (forecasts: LocationForecasts): [HTMLElement, HTMLElement, HTMLElement] => {

  const flatForecasts: Array<DetailedForecast> =
    forecasts.dayForecasts.map(x => x.forecasts).reduce((x, y) => x.concat(y), []); // Alternative to flatMap

  const gutterHeight = 5; // px

  // Our meteogram is made of four diagrams stacked on top of each other.
  // The first one shows the ThQ
  // The second one shows the cloud cover for high-level clouds (above 5000 m).
  // The third one shows the boundary layer, wind, and middle-level clouds.
  // The fourth one shows rainfalls and ground temperature.

  const thqDiagramHeight = 20; // px
  const thqDiagramTop    = gutterHeight;

  const highAirDiagramHeight = 20; // px
  const highAirDiagramTop    = thqDiagramTop + thqDiagramHeight + gutterHeight * 2;

  const airDiagramHeight = 400; // px
  // The main diagram shows the air from the ground level to 3500 m above ground level
  const middleCloudsTop  = forecasts.elevation + airDiagramHeightAboveGroundLevel // m
  const elevationScale  = new Scale([forecasts.elevation, middleCloudsTop], [0, airDiagramHeight], false);
  const firstElevationLevel = (Math.floor((forecasts.elevation + 150) / 500) + 1) * 500;
  let nextElevationLevel = firstElevationLevel;
  const elevationLevels = [forecasts.elevation];
  while (nextElevationLevel < middleCloudsTop) {
    elevationLevels.push(nextElevationLevel);
    nextElevationLevel = nextElevationLevel + 500;
  }
  const airDiagramTop   = highAirDiagramTop + highAirDiagramHeight; // No gutter between high air diagram and air diagram

  const rainDiagramResolution = 3; // Number of horizontal lines in the rain diagram
  const rainDiagramHeight   = 100; // px
  const rainStyle           = 'blue';
  const convectiveRainStyle = 'cyan';
  const maxRainLevel        = 15; // mm
  const minRainLevel        = 0;  // mm
  const rainLevelDelta      = maxRainLevel - minRainLevel;
  const rainScale           = new Scale([minRainLevel, maxRainLevel], [0, rainDiagramHeight], false);
  const rainLevels          = Array.from({ length: rainDiagramResolution }, (_, i) => minRainLevel + rainLevelDelta * i / rainDiagramResolution);
  const rainDiagramTop      = airDiagramTop + airDiagramHeight + gutterHeight * 4;

  const pressureScale     = new Scale([990, 1035 /* hPa */], [0, airDiagramHeight], false);
  const pressureLevels    = [990, 999, 1008, 1017, 1026, 1035];
  const pressureStyle     = '#CD5C5C'

  const minTemperature =
    Math.floor(
      flatForecasts.reduce((previousMin, forecast) => forecast.surface.dewPoint < previousMin ? forecast.surface.dewPoint : previousMin, Number.MAX_SAFE_INTEGER)
    );
  const maxTemperature =
    Math.ceil(
      flatForecasts.reduce((previousMax, forecast) => forecast.surface.temperature > previousMax ? forecast.surface.temperature : previousMax, Number.MIN_SAFE_INTEGER)
    );
  // Make sure horizontal divisions are whole numbers
  const temperatureDelta  = Math.ceil((maxTemperature - minTemperature) / rainDiagramResolution) * rainDiagramResolution;
  const temperatureScale  = new Scale([minTemperature, minTemperature + temperatureDelta], [0, rainDiagramHeight], false);
  const temperatureLevels = Array.from({ length: rainDiagramResolution }, (_, i) => minTemperature + temperatureDelta * i / 3);
  const temperatureStyle  = 'black';

  const skyStyle = '#85c1e9';

  const canvasWidth  = columnWidth * forecasts.dayForecasts.reduce((n, forecast) => n + forecast.forecasts.length, 0);
  const canvasHeight = rainDiagramTop + rainDiagramHeight + gutterHeight;
  const canvas = el(
    'canvas',
    {
      width: canvasWidth,
      height: canvasHeight,
      style: { width: `${canvasWidth}px`, height: `${canvasHeight}px` }
    }
  ) as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');

  if (ctx !== null && forecasts.dayForecasts.length !== 0) {

    const columns = (drawColumn: (forecast: DetailedForecast, columnStart: number, columnEnd: number, date: Date) => void): void => {
      let i = 0;
      forecasts.dayForecasts.forEach(dayForecast => {
        dayForecast.forecasts.forEach(forecast => {
          const columnStart = i * columnWidth;
          const columnEnd   = columnStart + columnWidth;
          drawColumn(forecast, columnStart, columnEnd, forecast.time);
          i = i + 1;
        });
      });
    }

    // ThQ diagram
    const thqDiagram = new Diagram([0, thqDiagramTop], thqDiagramHeight, ctx);

    columns((forecast, columnStart, columnEnd) => {
      const thq = thqValue(
        forecast.boundaryLayer.height,
        forecast.boundaryLayer.wind.u,
        forecast.boundaryLayer.wind.v,
        forecast.clouds.all
      )
      thqDiagram.fillRect(
        [columnStart, 0],
        [columnEnd, thqDiagramHeight],
        `${thqColorScale.interpolate(thq).css()}`
      );
      thqDiagram.rect(
        [columnStart, 0],
        [columnEnd, thqDiagramHeight],
        'dimgray'
      )
      thqDiagram.text(`${Math.round(thq * 100)}`, [columnStart + columnWidth / 2, 6], 'dimgray', 'center');
    });

    // High altitude air diagram
    const highAirDiagram = new Diagram([0, highAirDiagramTop], highAirDiagramHeight, ctx);

    columns((forecast, columnStart, columnEnd) => {
      // Blue sky
      highAirDiagram.fillRect(
        [columnStart, 0],
        [columnEnd,   highAirDiagramHeight],
        skyStyle
      );

      // Middle-level clouds
      highAirDiagram.fillRect(
        [columnStart, 0],
        [columnEnd,   highAirDiagramHeight / 2],
        `rgba(255, 255, 255, ${ (forecast.clouds.middleLevel) * 0.7 })`
      );
      // High-level clouds
      highAirDiagram.fillRect(
        [columnStart, highAirDiagramHeight / 2],
        [columnEnd,   highAirDiagramHeight],
        `rgba(255, 255, 255, ${ (forecast.clouds.highLevel) * 0.7 })`
      );
    });

    // Air diagram
    const airDiagram = new Diagram([0, airDiagramTop], airDiagramHeight, ctx);

    // Ground level & Boundary Layer
    columns((forecast, columnStart, columnEnd) => {
      // Boundary Layer
      const boundaryLayerHeight = elevationScale.apply(forecasts.elevation + forecast.boundaryLayer.height);
      airDiagram.fillRect(
        [columnStart, 0],
        [columnEnd,   boundaryLayerHeight],
        'mediumspringgreen'
      );
      // Blue sky
      airDiagram.fillRect(
        [columnStart, boundaryLayerHeight],
        [columnEnd,   airDiagramHeight],
        skyStyle
      )
    });

    // Clouds
    columns((forecast, columnStart, columnEnd) => {
      // Low-level clouds (up to 2 km above ground level)
      const lowCloudsTop = Math.min(forecasts.elevation + 2000, middleCloudsTop);
      const lowCloudsY   = elevationScale.apply(lowCloudsTop);
      airDiagram.fillRect(
        [columnStart, 0],
        [columnEnd,   lowCloudsY],
        `rgba(255, 255, 255, ${ (forecast.clouds.lowLevel) * 0.7 })`
      );

      // Middle-level clouds (if visible)
      if (lowCloudsTop < middleCloudsTop) {
        airDiagram.fillRect(
          [columnStart, lowCloudsY],
          [columnEnd,   elevationScale.apply(middleCloudsTop)],
          `rgba(255, 255, 255, ${ (forecast.clouds.middleLevel) * 0.7 })`
        );
      }

      // Cumuli
      // Cumuli base height is computed via Hennig formula
      const cumuliBase = 122.6 * (forecast.surface.temperature - forecast.surface.dewPoint);
      if (cumuliBase < forecast.boundaryLayer.height) {
        airDiagram.fillRect(
          [columnStart, elevationScale.apply(forecasts.elevation + cumuliBase)],
          [columnEnd, elevationScale.apply(forecasts.elevation + forecast.boundaryLayer.height)],
          columnCloud
        );
      }
    });

    // Thunderstorm risk
    let previousLightningX = 0;
    forecasts.dayForecasts.forEach(forecast => {
      const lightningWidth = forecast.forecasts.length * columnWidth;
      const x = previousLightningX + lightningWidth / 2;
      const y = airDiagramHeight - lightningWidth / 2;
      if (forecast.thunderstormRisk > 0) {
        let lightningStyle: string;
        switch (forecast.thunderstormRisk) {
          case 1: lightningStyle = 'yellow'; break
          case 2: lightningStyle = 'orange'; break
          case 3: lightningStyle = 'red'; break
          default: lightningStyle = 'purple'; break
        }
        airDiagram.fillShape(lightningShape(x, y, lightningWidth), lightningStyle);
      }
      previousLightningX = previousLightningX + lightningWidth;
    });

    // Wind
    columns((forecast, columnStart, _) => {
      const windCenterX = columnStart + columnWidth / 2;
      const windColor = `rgba(62, 0, 0, 0.25)`;
      // Surface wind
      drawWindArrow(ctx, windCenterX, airDiagram.projectY(0), columnWidth - 6, windColor, forecast.surface.wind.u, forecast.surface.wind.v);
      // Air wind
      forecast.windsAboveGround.forEach((wind) => {
        drawWindArrow(ctx, windCenterX, airDiagram.projectY(elevationScale.apply(wind.elevation)), columnWidth - 6, windColor, wind.u, wind.v);
      });
    });

    // Isotherm 0°C
    const isothermZeroStyle = 'dimgray';
    flatForecasts
      .reduce((previousForecast, forecast, i) => {
        const x = columnWidth * (i - 0.5);
        const y = elevationScale.apply(previousForecast.isothermZero);
        let correctedY: number | undefined = undefined;
        if (previousForecast.isothermZero < forecasts.elevation) {
          correctedY = elevationScale.apply(forecasts.elevation) - 15;
        } else if (previousForecast.isothermZero > forecasts.elevation + airDiagramHeightAboveGroundLevel) {
          correctedY = elevationScale.apply(forecasts.elevation + airDiagramHeightAboveGroundLevel) + highAirDiagramHeight + 3;
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
          [columnWidth * (i + 0.5), elevationScale.apply(forecast.isothermZero)],
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

    // Elevation levels
    elevationLevels.forEach(elevation => {
      const y = elevationScale.apply(elevation);
      airDiagram.line([0, y], [canvasWidth, y], 'gray');
    });

    // Rain diagram
    const rainDiagram = new Diagram([0, rainDiagramTop], rainDiagramHeight, ctx);

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
          const x1 = columnWidth * (i - 0.5);
          const x2 = columnWidth * (i + 0.5)
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
  }

  const canvasLeftKey = el(
    'canvas',
    {
      width: keyWidth,
      height: canvasHeight,
      style: { flex: '0 0 auto', width: `${keyWidth}px`, height: `${canvasHeight}px` }
    }
  ) as HTMLCanvasElement;
  const leftKeyCtx = canvasLeftKey.getContext('2d');
  if (leftKeyCtx !== null) {
    leftKeyCtx.textAlign    = 'right';
    leftKeyCtx.textBaseline = 'middle';

    // Thq
    const thqDiagram = new Diagram([0, thqDiagramTop], thqDiagramHeight, leftKeyCtx);
    thqDiagram.text('ThQ', [keyWidth / 2, 8], 'black', 'center');

    // High air diagram
    const highAirDiagram = new Diagram([0, highAirDiagramTop], highAirDiagramHeight, leftKeyCtx);
    highAirDiagram.line(
      [keyWidth - leftKeyCtx.lineWidth, 0],
      [keyWidth - leftKeyCtx.lineWidth, highAirDiagramHeight],
      'black',
      [5, 3]
    );

    // Elevation
    const airDiagram = new Diagram([0, airDiagramTop], airDiagramHeight, leftKeyCtx);
    airDiagram.line(
      [keyWidth - leftKeyCtx.lineWidth, 0],
      [keyWidth - leftKeyCtx.lineWidth, airDiagramHeight],
      'black'
    );
    airDiagram.text('m', [keyWidth - 5, airDiagramHeight - 15], 'black');

    elevationLevels.forEach(elevation => {
      const y = elevationScale.apply(elevation);
      airDiagram.line(
        [keyWidth - 8, y],
        [keyWidth,     y],
        'black'
      );
      airDiagram.text(`${Math.round(elevation)}`, [keyWidth - 10, y], 'black');
    });

    // Rain
    const rainDiagram = new Diagram([0, rainDiagramTop], rainDiagramHeight, leftKeyCtx);
    rainDiagram.line(
      [keyWidth - leftKeyCtx.lineWidth, 0],
      [keyWidth - leftKeyCtx.lineWidth, rainDiagramHeight],
      rainStyle
    );
    rainDiagram.text('mm', [keyWidth - 5, rainDiagramHeight], rainStyle);

    rainLevels.forEach(rainMillimeters => {
      const y = rainScale.apply(rainMillimeters);
      rainDiagram.line(
        [keyWidth - 8, y],
        [keyWidth, y],
        rainStyle
      );
      rainDiagram.text(`${rainMillimeters}`, [keyWidth - 10, y], rainStyle);
    });

  }

  const canvasRightKey = el(
    'canvas',
    {
      width: keyWidth,
      height: canvasHeight,
      style: { flex: '0 0 auto', width: `${keyWidth}px`, height: `${canvasHeight}px` }
    }
  ) as HTMLCanvasElement;
  const rightKeyCtx = canvasRightKey.getContext('2d');
  if (rightKeyCtx !== null) {
    rightKeyCtx.textAlign    = 'left';
    rightKeyCtx.textBaseline = 'middle';

    // Temperature
    const rainDiagram = new Diagram([0, rainDiagramTop], rainDiagramHeight, rightKeyCtx);
    rainDiagram.line(
      [0, 0],
      [0, rainDiagramHeight],
      temperatureStyle
    );
    rainDiagram.text('°C', [5, rainDiagramHeight], temperatureStyle);

    temperatureLevels.forEach(temperatureDegrees => {
      const y = temperatureScale.apply(temperatureDegrees);
      rainDiagram.line(
        [0, y],
        [8, y],
        temperatureStyle
      );
      rainDiagram.text(`${temperatureDegrees}`, [10, y], temperatureStyle);
    });

    // Pressure
    const airDiagram = new Diagram([0, airDiagramTop], airDiagramHeight, rightKeyCtx);
    airDiagram.line(
      [0, 0],
      [0, airDiagramHeight],
      pressureStyle
    );
    airDiagram.text('hPa', [5, airDiagramHeight - 15], pressureStyle);
    pressureLevels.forEach(pascals => {
      const y = pressureScale.apply(pascals);
      airDiagram.line(
        [0, y],
        [8, y],
        pressureStyle
      );
      airDiagram.text(`${pascals}`, [10, y], pressureStyle);
    });

  }

  return [canvasLeftKey, canvas, canvasRightKey]
}
