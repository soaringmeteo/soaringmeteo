import {Layer, ReactiveComponents, summarizerFromLocationDetails} from "./Layer";
import {type ForecastMetadata} from "../data/ForecastMetadata";
import {DetailedForecast, Wind} from "../data/LocationForecasts";
import {useI18n, usingMessages} from "../i18n";
import {type Zone} from "../data/Model";

const windComponents = (
  windValue: (detailedForecast: DetailedForecast) => Wind
) => (props: {
  forecastMetadata: ForecastMetadata,
  zone: Zone,
  hourOffset: number,
}): ReactiveComponents => {

  const { m } = useI18n();

  const summarizer = summarizerFromLocationDetails(props, detailedForecast => {
    const { u, v } = windValue(detailedForecast);
    const windSpeed = Math.sqrt(u * u + v * v);
    return [
      [() => m().summaryWindSpeed(), <span>{ Math.round(windSpeed) } km/h</span>]
    ]
  });

  const help = <p>
    { m().helpLayerWind() }
  </p>;

  return {
    summarizer,
    mapKey: <div />,
    help: help
  }
};

export const boundaryLayerWindLayer: Layer = {
  key: 'boundary-layer-wind',
  name: usingMessages(m => m.layerWindBoundaryLayer()),
  title: usingMessages(m => m.layerWindBoundaryLayerLegend()),
  dataPath: 'wind-boundary-layer',
  reactiveComponents: windComponents(data => data.boundaryLayer.wind)
};

export const surfaceWindLayer: Layer = {
  key: 'surface-wind',
  name: usingMessages(m => m.layerWindSurface()),
  title: usingMessages(m => m.layerWindSurfaceLegend()),
  dataPath: 'wind-surface',
  reactiveComponents: windComponents(data => data.surface.wind)
};

export const soaringLayerTopWindLayer: Layer = {
  key: 'soaring-layer-top-wind',
  name: usingMessages(m => m.layerWindSoaringLayerTop()),
  title: usingMessages(m => m.layerWindSoaringLayerTopLegend()),
  dataPath: 'wind-soaring-layer-top',
  reactiveComponents: windComponents(data => data.winds.soaringLayerTop)
};

export const _300MAGLWindLayer: Layer = {
  key: '300m-agl-wind',
  name: usingMessages(m => m.layerWind300MAGL()),
  title: usingMessages(m => m.layerWind300MAGLLegend()),
  dataPath: 'wind-300m-agl',
  reactiveComponents: windComponents(data => data.winds._300MAGL)
};

export const _2000MAMSLWindLayer: Layer = {
  key: '2000m-amsl-wind',
  name: usingMessages(m => m.layerWind2000AMSL()),
  title: usingMessages(m => m.layerWind2000AMSLLegend()),
  dataPath: 'wind-2000m-amsl',
  reactiveComponents: windComponents( data => data.winds._2000MAMSL)
};

export const _3000MAMSLWindLayer: Layer = {
  key: '3000m-amsl-wind',
  name: usingMessages(m => m.layerWind3000AMSL()),
  title: usingMessages(m => m.layerWind3000AMSLLegend()),
  dataPath: 'wind-3000m-amsl',
  reactiveComponents: windComponents(data => data.winds._3000MAMSL)
};

export const _4000MAMSLWindLayer: Layer = {
  key: '4000m-amsl-wind',
  name: usingMessages(m => m.layerWind4000AMSL()),
  title: usingMessages(m => m.layerWind4000AMSLLegend()),
  dataPath: 'wind-4000m-amsl',
  reactiveComponents: windComponents(data => data.winds._4000MAMSL)
};
