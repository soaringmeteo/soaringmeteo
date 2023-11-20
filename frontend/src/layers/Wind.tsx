import {Layer, ReactiveComponents, summarizerFromLocationDetails} from "./Layer";
import {ForecastMetadata, Zone} from "../data/ForecastMetadata";
import {DetailedForecast, Wind} from "../data/LocationForecasts";

const windComponents = (
  windValue: (detailedForecast: DetailedForecast) => Wind,
  dataPath: string
) => (props: {
  forecastMetadata: ForecastMetadata,
  zone: Zone,
  hourOffset: number,
}): ReactiveComponents => {

  const summarizer = summarizerFromLocationDetails(props, detailedForecast => {
    const { u, v } = windValue(detailedForecast);
    const windSpeed = Math.sqrt(u * u + v * v);
    return [
      ["Wind speed", <span>{ Math.round(windSpeed) } km/h</span>]
    ]
  });

  const help =
    <p>
      The wind speed and direction are shown with an arrow. The wind flows in the
      direction of the arrow. For instance, an arrow that points to the right means
      that the wind comes from west and goes to east.
    </p>;

  return {
    dataPath: () => dataPath,
    summarizer,
    mapKey: <div />,
    help: help
  }
};

export const boundaryLayerWindLayer: Layer = {
  key: 'boundary-layer-wind',
  name: 'Boundary Layer',
  title: 'Average wind speed and direction in the boundary layer',
  reactiveComponents: windComponents(data => data.boundaryLayer.wind, 'wind-boundary-layer')
};

export const surfaceWindLayer: Layer = {
  key: 'surface-wind',
  name: 'Surface',
  title: 'Wind speed and direction on the ground',
  reactiveComponents: windComponents(data => data.surface.wind, 'wind-surface')
};

export const soaringLayerTopWindLayer: Layer = {
  key: 'soaring-layer-top-wind',
  name: 'Soaring Layer Top',
  title: 'Wind speed and direction at the top of the soaring layer',
  reactiveComponents: windComponents(data => data.winds.soaringLayerTop, 'wind-soaring-layer-top')
};

export const _300MAGLWindLayer: Layer = {
  key: '300m-agl-wind',
  name: '300 m AGL',
  title: 'Wind speed and direction at 300 m above the ground level',
  reactiveComponents: windComponents(data => data.winds._300MAGL, 'wind-300m-agl')
};

export const _2000MAMSLWindLayer: Layer = {
  key: '2000m-amsl-wind',
  name: '2000 m AMSL',
  title: 'Wind speed and direction at 2000 m above the mean sea level',
  reactiveComponents: windComponents( data => data.winds._2000MAMSL, 'wind-2000m-amsl')
};

export const _3000MAMSLWindLayer: Layer = {
  key: '3000m-amsl-wind',
  name: '3000 m AMSL',
  title: 'Wind speed and direction at 3000 m above the mean sea level',
  reactiveComponents: windComponents(data => data.winds._3000MAMSL, 'wind-3000m-amsl')
};

export const _4000MAMSLWindLayer: Layer = {
  key: '4000m-amsl-wind',
  name: '4000 m AMSL',
  title: 'Wind speed and direction at 4000 m above the mean sea level',
  reactiveComponents: windComponents(data => data.winds._4000MAMSL, 'wind-4000m-amsl')
};
