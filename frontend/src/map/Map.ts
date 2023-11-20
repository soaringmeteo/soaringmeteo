import { Feature, Map, MapBrowserEvent, View } from 'ol';
import { Tile as TileLayer, Image as ImageLayer, Vector as VectorLayer, VectorTile as VectorTileLayer } from 'ol/layer';
import { ImageStatic, Vector as VectorSource, VectorTile as VectorTileSource, XYZ } from "ol/source";
import { fromLonLat, get as getProjection, Projection, toLonLat } from "ol/proj";
import { ScaleLine } from "ol/control";
import { defaults as defaultInteractions } from "ol/interaction";
import { Coordinate } from "ol/coordinate";
import { Point } from 'ol/geom';
import { GeoJSON } from "ol/format";
import { Style, Icon, Text, Fill } from 'ol/style';
import { Accessor, createSignal } from 'solid-js';
import windImg0 from '../images/wind-0.png';
import windImg1 from '../images/wind-1.png';
import windImg2 from '../images/wind-2.png';
import windImg3 from '../images/wind-3.png';
import windImg4 from '../images/wind-4.png';
import windImg5 from '../images/wind-5.png';
import windImg6 from '../images/wind-6.png';
import windImg7 from '../images/wind-7.png';
import windImg8 from '../images/wind-8.png';
import windImg9 from '../images/wind-9.png';
import markerImg from '../images/marker-icon.png';
import { Extent } from "ol/extent";
import proj4 from 'proj4';
import { register } from "ol/proj/proj4";

const windImages = [windImg0, windImg1, windImg2, windImg3, windImg4, windImg5, windImg6, windImg7, windImg8, windImg9];

const mapTilerUrl = 'https://api.maptiler.com/maps/topo/{z}/{x}/{y}.png?key=6hEH9bUrAyDHR6nLDUf6';
const smUrl = 'https://tiles.soaringmeteo.org/{z}/{x}/{y}.png';
const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const webMercatorProjection: Projection = (() => {
  const projection = getProjection('EPSG:3857');
  if (projection === null) throw 'Projection not found';
  return projection
})();

proj4.defs(
  'WRF',
  '+proj=lcc +lat_1=45.849 +lat_2=45.849 +lat_0=46.0086 +lon_0=11.4 +a=6370000 +b=6370000 +units=m'
);
register(proj4)

export const viewProjection: Projection = webMercatorProjection;

const locationAndZoomKey = 'location-and-zoom'

const loadLocationAndZoom = (): [Coordinate, number] => {
  // First, read from the URL parameters
  const params = new URLSearchParams(window.location.search);
  const [lat, lng, z] = [params.get('lat'), params.get('lng'), params.get('z')];
  if (lat !== null && lng !== null) {
    return [
      fromLonLat([+lng, +lat], webMercatorProjection) as [number, number],
      z === null ? 7 : +z
    ]
  }
  // Second, read from local storage (returning visitor)
  const storedLocationAndZoom = window.localStorage.getItem(locationAndZoomKey);
  if (storedLocationAndZoom == null) {
    return [
      fromLonLat([9.5, 45.5], webMercatorProjection),
      7
    ]
  } else {
    const [center, zoom] = JSON.parse(storedLocationAndZoom); // TODO versioning
    return [
      fromLonLat([center[1], center[0]], webMercatorProjection),
      zoom
    ]
  }
};

const saveLocationAndZoom = (location: [number, number], zoom: number) => {
  const [lng, lat] = toLonLat(location, webMercatorProjection);
  const url = new URL(window.location.toString());
  url.searchParams.set('lat', lat.toFixed(3));
  url.searchParams.set('lng', lng.toFixed(3));
  url.searchParams.set('z', zoom.toFixed(1));
  window.history.replaceState(null, '', url);
  window.localStorage.setItem(locationAndZoomKey, JSON.stringify([[lat, lng], zoom]));
};

type MapHooks = {
  locationClicks: Accessor<MapBrowserEvent<any> | undefined>
  setPrimaryLayerSource: (url: string, projection: string, extent: Extent) => void
  hidePrimaryLayer: () => void
  setWindLayerSource: (url: string, minViewZoom: number, extent: Extent, maxZoom: number, tileSize: number) => void
  hideWindLayer: () => void
  enableWindNumericalValues: (value: boolean) => void
  showMarker: (latitude: number, longitude: number) => void
  hideMarker: () => void
}

export const initializeMap = (element: HTMLElement): MapHooks => {

  const baseLayer = new TileLayer({
    source: new XYZ({
      url: smUrl,
      maxZoom: 14,
      projection: webMercatorProjection
    })
  });

  const primaryLayer = new ImageLayer({
    opacity: 0.35,
  });

  const secondaryLayer = new VectorTileLayer({
    renderMode: 'hybrid',
    // renderBuffer: 100, // I didn’t see a difference in the rendering, maybe this is a bug, see https://gis.stackexchange.com/questions/217141/cropped-vector-tiles-in-openlayers
    declutter: true, // That seems to “fix” the `renderBuffer` issue, but that might be temporary, see https://github.com/openlayers/openlayers/issues/11191
  });

  // Marker on the position of the selected location
  const markerFeature = new Feature();
  const markerLayer = new VectorLayer({
    source: new VectorSource({ features: [markerFeature] }),
    visible: false, // visibility is triggered in the effect below
    style: new Style({
      image: new Icon({
        src: markerImg,
        anchor: [0.5, 1]
      })
    }),
  });

  const [location, zoom] = loadLocationAndZoom();
  const map = new Map({
    target: element,
    layers: [
      baseLayer,
      primaryLayer,
      secondaryLayer,
      markerLayer
    ],
    view: new View({
      projection: viewProjection,
      center: location,
      zoom: zoom
    }),
    controls: [
      new ScaleLine({
        units: 'metric',
        bar: true,
        steps: 2,
        text: false
      })
    ],
    interactions: defaultInteractions({ pinchRotate: false })
  });

  map.on('moveend', () => {
    const center = map.getView().getCenter();
    const zoom = map.getView().getZoom();
    if (center !== undefined && zoom !== undefined) {
      saveLocationAndZoom(center as [number, number], zoom);
    }
  });

  // Signal of “popup requests”: when the users click on the map, they request a popup
  // to be displayed with numerical information about the visible layer.
  const [locationClicks, setPopupRequest] = createSignal<undefined | MapBrowserEvent<any>>(undefined);
  map.on('click', (event) => {
    setPopupRequest(event);
  });

  return {
    locationClicks: locationClicks,
    setPrimaryLayerSource: (url: string, projection: string, extent: Extent): void => {
      primaryLayer.setSource(new ImageStatic({
        url: url,
        projection: projection,
        imageExtent: extent,
        interpolate: false
      }));
    },
    hidePrimaryLayer: (): void => {
      primaryLayer.setSource(null);
    },
    setWindLayerSource: (url: string, minViewZoom: number, extent: Extent, maxZoom: number, tileSize: number): void => {
      secondaryLayer.setMinZoom(minViewZoom);
      secondaryLayer.setSource(new VectorTileSource({
        url: url,
        extent: extent,
        maxZoom: maxZoom,
        tileSize: tileSize,
        format: new GeoJSON(),
        transition: 1000
      }));
    },
    hideWindLayer: (): void => {
      secondaryLayer.setSource(null);
    },
    enableWindNumericalValues: (value: boolean): void => {
      secondaryLayer.setStyle((point) => {
        const speed = point.get('speed');
        const direction = point.get('direction');
        const imageStyle = new Icon({
          src: windImages[Math.min(Math.floor(speed / 5), 9)],
          rotation: direction,
          rotateWithView: true,
          scale: windArrowScale(speed),
          opacity: 0.75,
        });
        const offset = windNumericalValueOffset(speed);
        const textStyle = new Text({
          text: `${speed}`,
          offsetY: offset,
          offsetX: offset,
          fill: new Fill({ color: 'rgba(0, 0, 0, 0.8)' })
        });
        return new Style(value ? { image: imageStyle, text: textStyle } : { image: imageStyle })
      })
    },
    showMarker: (latitude: number, longitude: number): void => {
      markerFeature.setGeometry(new Point(fromLonLat([longitude, latitude])));
      markerLayer.setVisible(true);
    },
    hideMarker: (): void => {
      markerLayer.setVisible(false);
    }
  }
};

const linearRamp = (x0: number, y0: number, x1: number, y1: number) => (x: number): number => {
  if (x <= x0) return y0
  else if (x >= x1) return y1
  else return y0 + (x - x0) * (y1 - y0) / (x1 - x0)
};

const windArrowScale = linearRamp(0, 0.5, 40, 0.8);
const windNumericalValueOffset = linearRamp(0, 8, 40, 12);
