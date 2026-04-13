import {Layer, ReactiveComponents, summarizerFromLocationDetails} from "./Layer";
import {type ForecastMetadata} from "../data/ForecastMetadata";
import {DetailedForecast, Wind} from "../data/LocationForecasts";
import {useI18n, usingMessages} from "../i18n";
import {type Zone} from "../data/Model";

const windComponents = (
  dataPath: string,
  windValue: (detailedForecast: DetailedForecast) => Wind
) => (props: {
  forecastMetadata: ForecastMetadata,
  zone: Zone,
  hourOffset: number,
  daltonianColorScaleEnabled: boolean,
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
    dataPath: () => dataPath,
    mapKey: <div />,
    help: help
  }
};

export const boundaryLayerWindLayer: Layer = {
  key: 'boundary-layer-wind',
  name: usingMessages(m => m.layerWindBoundaryLayer()),
  title: usingMessages(m => m.layerWindBoundaryLayerLegend()),
  reactiveComponents: windComponents('wind-boundary-layer', data => data.boundaryLayer.wind)
};

export const surfaceWindLayer: Layer = {
  key: 'surface-wind',
  name: usingMessages(m => m.layerWindSurface()),
  title: usingMessages(m => m.layerWindSurfaceLegend()),
  reactiveComponents: windComponents('wind-surface', data => data.surface.wind)
};

export const soaringLayerTopWindLayer: Layer = {
  key: 'soaring-layer-top-wind',
  name: usingMessages(m => m.layerWindSoaringLayerTop()),
  title: usingMessages(m => m.layerWindSoaringLayerTopLegend()),
  reactiveComponents: windComponents('wind-soaring-layer-top', data => data.winds.soaringLayerTop)
};

export const _300MAGLWindLayer: Layer = {
  key: '300m-agl-wind',
  name: usingMessages(m => m.layerWind300MAGL()),
  title: usingMessages(m => m.layerWind300MAGLLegend()),
  reactiveComponents: windComponents('wind-300m-agl', data => data.winds._300MAGL)
};

export const _2000MAMSLWindLayer: Layer = {
  key: '2000m-amsl-wind',
  name: usingMessages(m => m.layerWind2000AMSL()),
  title: usingMessages(m => m.layerWind2000AMSLLegend()),
  reactiveComponents: windComponents('wind-2000m-amsl', data => data.winds._2000MAMSL)
};

export const _3000MAMSLWindLayer: Layer = {
  key: '3000m-amsl-wind',
  name: usingMessages(m => m.layerWind3000AMSL()),
  title: usingMessages(m => m.layerWind3000AMSLLegend()),
  reactiveComponents: windComponents('wind-3000m-amsl', data => data.winds._3000MAMSL)
};

export const _4000MAMSLWindLayer: Layer = {
  key: '4000m-amsl-wind',
  name: usingMessages(m => m.layerWind4000AMSL()),
  title: usingMessages(m => m.layerWind4000AMSLLegend()),
  reactiveComponents: windComponents('wind-4000m-amsl', data => data.winds._4000MAMSL)
};
