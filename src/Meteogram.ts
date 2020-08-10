import { el } from 'redom';
import { DetailedForecastData, LocationForecasts } from './Forecast';
import { drawWindArrow } from './shapes';
import { Diagram, Scale } from './Diagram';

export const columnWidth = 33;

/**
 * @return [left key element, meteogram element, right key element]
 */
export const meteogram = (forecasts: LocationForecasts): [HTMLElement, HTMLElement, HTMLElement] => {

  const gutterHeight = 15;

  const airDiagramHeight = 500; // px
  const elevationScale  = new Scale([0, 6000 /* m (TODO dynamic) */], [0, airDiagramHeight], true);
  const elevationLevels = [0, 1000, 2000, 3000, 4000, 5000, 6000];

  const rainDiagramHeight   = 80; // px
  const rainStyle           = 'blue';
  const convectiveRainStyle = 'cyan';
  const rainScale           = new Scale([0, 15 /* mm */], [0, rainDiagramHeight], false);
  const rainLevels          = [0, 5, 10, 15];
  const rainDiagramTop      = gutterHeight + airDiagramHeight + gutterHeight;

  const pressureScale     = new Scale([980, 1040 /* hPa */], [0, airDiagramHeight], false);
  const pressureLevels    = [980, 990, 1000, 1010, 1020, 1030, 1040];
  const pressureStyle     = 'black'

  const temperatureScale  = new Scale([0, 30], [0, rainDiagramHeight], false);
  const temperatureLevels = [0, 10, 20, 30];
  const temperatureStyle  = 'black';

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

    const columns = (drawColumn: (forecast: DetailedForecastData, columnStart: number, columnEnd: number, date: Date) => void): void => {
      let i = 0;
      forecasts.dayForecasts.forEach(dayForecast => {
        dayForecast.forecasts.forEach(forecast => {
          const columnStart = i * columnWidth;
          const columnEnd   = columnStart + columnWidth;
          drawColumn(forecast.data, columnStart, columnEnd, forecast.time);
          i = i + 1;
        });
      });
    }

    // Air diagram
    const airDiagram = new Diagram([0, gutterHeight], airDiagramHeight, ctx);

    // Ground level & Boundary Layer
    columns((forecast, columnStart, columnEnd) => {
      // Ground level
      const groundLevelY = elevationScale.apply(forecasts.elevation);
      airDiagram.fillRect(
        [columnStart, 0],
        [columnEnd,   groundLevelY],
        'maroon'
      );
      // Boundary Layer
      const boundaryLayerHeight = elevationScale.apply(forecast.bl.h);
      airDiagram.fillRect(
        [columnStart, groundLevelY],
        [columnEnd,   groundLevelY + boundaryLayerHeight],
        'mediumspringgreen'
      );
    });

    // Wind
    columns((forecast, columnStart, _) => {
      const groundLevelY = elevationScale.apply(forecasts.elevation);
      const boundaryLayerHeight = elevationScale.apply(forecast.bl.h);
      const windCenterX = columnStart + columnWidth / 2;
      const windColor = `rgba(62, 0, 0, 0.35)`;
      // Surface wind
      drawWindArrow(ctx, windCenterX, airDiagram.projectY(groundLevelY), columnWidth, windColor, forecast.s.u, forecast.s.v);
      // Boundary layer wind
      drawWindArrow(ctx, windCenterX, airDiagram.projectY(groundLevelY + boundaryLayerHeight / 2), columnWidth, windColor, forecast.bl.u, forecast.bl.v);
      // TODO Top wind
    });

    // Isotherm 0°C
    forecasts.dayForecasts
      .map(f => f.forecasts).reduce((x, y) => x.concat(y), []) // Alternative to flatMap
      .reduce(
      (previousForecast, forecast, i) => {
        airDiagram.line(
          [columnWidth * (i - 0.5), elevationScale.apply(previousForecast.data.iso)],
          [columnWidth * (i + 0.5), elevationScale.apply(forecast.data.iso)],
          'cyan'
        );
        return forecast
      }
    );

    // Clouds
    columns((forecast, columnStart, columnEnd) => {
      const groundLevelY = elevationScale.apply(forecasts.elevation);
      // Low-level clouds
      const lowCloudsTop = 2000; // m
      if (forecasts.elevation < lowCloudsTop) {
        const lowCloudsY = elevationScale.apply(lowCloudsTop);
        airDiagram.fillRect(
          [columnStart, groundLevelY],
          [columnEnd,   lowCloudsY],
          `rgba(60, 60, 60, ${ (forecast.c.l / 100) / 2 })`
        );
      }

      // Middle-level clouds
      const middleCloudsTop    = 6000; // m
      const middleCloudsBottom = Math.max(forecasts.elevation, lowCloudsTop);
      const middleCloudsY0     = elevationScale.apply(middleCloudsBottom);
      const middleCloudsY1     = elevationScale.apply(middleCloudsTop);
      airDiagram.fillRect(
        [columnStart, middleCloudsY0],
        [columnEnd,   middleCloudsY1],
        `rgba(60, 60, 60, ${ (forecast.c.m / 100) / 2 })`
      );

      // TODO High-level clouds
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
        [columnEnd,   rainScale.apply(forecast.r.c)],
        convectiveRainStyle
      );
      rainDiagram.fillRect(
        [columnStart, rainScale.apply(forecast.r.c)],
        [columnEnd,   rainScale.apply(forecast.r.t)],
        rainStyle
      );
    });

    // QNH, temperature, and humidity
    forecasts.dayForecasts
      .map(f => f.forecasts).reduce((x, y) => x.concat(y), []) // Alternative to flatMap
      .reduce(
        (previousForecast, forecast, i) => {
          const x1 = columnWidth * (i - 0.5);
          const x2 = columnWidth * (i + 0.5)
          airDiagram.line(
            [x1, pressureScale.apply(previousForecast.data.mslet)],
            [x2, pressureScale.apply(forecast.data.mslet)],
            pressureStyle
          );
          rainDiagram.line(
            [x1, temperatureScale.apply(previousForecast.data.s.t)],
            [x2, temperatureScale.apply(forecast.data.s.t)],
            'red'
          );
          rainDiagram.line(
            [x1, temperatureScale.apply(previousForecast.data.s.t * previousForecast.data.s.rh / 100)],
            [x2, temperatureScale.apply(forecast.data.s.t * forecast.data.s.rh / 100)],
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
        airDiagram.line([columnStart, 0], [columnStart, airDiagramHeight], 'gray');
        rainDiagram.line([columnStart, 0], [columnStart, rainDiagramHeight], 'gray');
      }
      previousDay = currentDay;
    })
  }

  const keyWidth = 60; // TODO Unify with margin in ForecastSelect.ts
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

    // Elevation
    const airDiagram = new Diagram([0, gutterHeight], airDiagramHeight, leftKeyCtx);
    airDiagram.line(
      [keyWidth - leftKeyCtx.lineWidth, 0],
      [keyWidth - leftKeyCtx.lineWidth, airDiagramHeight],
      'black'
    );

    elevationLevels.forEach(elevation => {
      const y = elevationScale.apply(elevation);
      airDiagram.line(
        [keyWidth - 8, y],
        [keyWidth,     y],
        'black'
      );

      airDiagram.text(`${elevation} m`, [keyWidth - 10, y], 'black');
    });

    // Rain
    const rainDiagram = new Diagram([0, rainDiagramTop], rainDiagramHeight, leftKeyCtx);
    rainDiagram.line(
      [keyWidth - leftKeyCtx.lineWidth, 0],
      [keyWidth - leftKeyCtx.lineWidth, rainDiagramHeight],
      rainStyle
    );

    rainLevels.forEach(rainMillimeters => {
      const y = rainScale.apply(rainMillimeters);
      rainDiagram.line(
        [keyWidth - 8, y],
        [keyWidth, y],
        rainStyle
      );

      rainDiagram.text(`${rainMillimeters} mm`, [keyWidth - 10, y], rainStyle);
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

    temperatureLevels.forEach(temperatureDegrees => {
      const y = temperatureScale.apply(temperatureDegrees);
      rainDiagram.line(
        [0, y],
        [8, y],
        temperatureStyle
      );

      rainDiagram.text(`${temperatureDegrees} °C`, [10, y], temperatureStyle);
    });

    // Pressure
    const airDiagram = new Diagram([0, gutterHeight], airDiagramHeight, rightKeyCtx);
    pressureLevels.forEach(pascals => {
      const y = pressureScale.apply(pascals);
      airDiagram.line(
        [0, y],
        [8, y],
        pressureStyle
      );
      airDiagram.text(`${pascals} hPa`, [10, y], pressureStyle);
    });

  }

  return [canvasLeftKey, canvas, canvasRightKey]
}

// TODO Move somewhere else
const windSpeed = (forecast: DetailedForecastData): number => {
  const u = forecast.bl.u;
  const v = forecast.bl.v;
  return Math.round(Math.sqrt(u * u + v * v))
}
