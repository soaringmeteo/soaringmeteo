import {DetailedForecast, LocationForecasts} from "./data/LocationForecasts";
import {diagramsAvailableHeight, meteogramColumnWidth} from "./styles/Styles";

export type DetailedView = Diagram | Summary
export type DetailedViewType = 'meteogram' | 'sounding' | 'summary'

export type Diagram = {
  viewType: 'meteogram' | 'sounding'
  locationForecasts: LocationForecasts
  latitude: number
  longitude: number
  useSmallScreenLayout: boolean
  diagramHeight: number
}

type Summary = {
  viewType: 'summary'
  latitude: number
  longitude: number
}

export const diagramHeight = (diagramType: 'meteogram' | 'sounding', forecasts: LocationForecasts): number => {
  const flatForecasts: Array<DetailedForecast> =
    forecasts.dayForecasts.map(x => x.forecasts).reduce((x, y) => x.concat(y), []); // Alternative to flatMap
  const maxBoundaryLayerDepth =
    flatForecasts.reduce((x, forecast) => Math.max(x, forecast.boundaryLayer.depth), -Infinity);

  let preferredHeight;
  if (diagramType === 'meteogram') {
    // In the air diagram, show 1000 meters above the boundary layer depth, and at least 2000 meters above the ground level
    const airDiagramHeightAboveGroundLevel = Math.max(2000, maxBoundaryLayerDepth + 1000 /* meters */);
    const numberOfEntries =
      // We assume that all the forecasts have similar density of information
      flatForecasts[0].aboveGround
        .findIndex(aboveGround => aboveGround.elevation > forecasts.elevation + airDiagramHeightAboveGroundLevel);
    preferredHeight =
      35 + 20 + 20 + 11 + 20 + 60 + (numberOfEntries >= 0 ? numberOfEntries : flatForecasts[0].aboveGround.length) * meteogramColumnWidth;
  } else if (diagramType === 'sounding') {
    const maxElevation = forecasts.elevation + maxBoundaryLayerDepth;
    const numberOfEntries = flatForecasts[0].aboveGround.findIndex(aboveGround => aboveGround.elevation >= maxElevation)
    preferredHeight =
      (numberOfEntries >= 0 ? numberOfEntries : flatForecasts[0].aboveGround.length) * 30 * 1.2;
  }
  return Math.min(preferredHeight, diagramsAvailableHeight);
};
