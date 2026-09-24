import { Feature, Map, MapBrowserEvent, View } from 'ol';
import { Tile as TileLayer, Image as ImageLayer, Vector as VectorLayer, VectorTile as VectorTileLayer } from 'ol/layer';
import { ImageStatic, Vector as VectorSource, VectorTile as VectorTileSource, XYZ } from "ol/source";
import { fromLonLat, get as getProjection, Projection, toLonLat } from "ol/proj";
import { ScaleLine } from "ol/control";
import { defaults as defaultInteractions } from "ol/interaction";
import { Coordinate } from "ol/coordinate";
import {Point, Polygon} from 'ol/geom';
import { circular as circularPolygon } from 'ol/geom/Polygon';
import { MVT } from "ol/format";
import { Style, Icon, Text, Fill, Stroke, Circle as CircleStyle } from 'ol/style';
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
const kosmtikUrl = 'http://localhost:8888/style/tile/{z}/{x}/{y}.png';

const webMercatorProjection: Projection = (() => {
  const projection = getProjection('EPSG:3857');
  if (projection === null) throw 'Projection not found';
  return projection
})();

// Earth radius (meters) assumed by WRF/WPS (spherical datum).
const wrfSphericalEarthRadius = 6370000;

// Map projection parameters shared by a coarse WRF domain and all of its nested domains, as found at
// the top of a &geogrid section of namelist.wps (map_proj is always 'lambert', so it is omitted here).
type WrfProjection = {
  // standard parallels (equal values = tangent cone). Best practice: use two standard parallels, one at
  // one third and one at two thirds of the domain height. See https://proj.org/operations/projections/lcc.html
  trueLat1: number,
  trueLat2?: number,
  // center of the coarse domain
  refLat: number,
  refLon: number,
  // longitude parallel to the y-axis (increasing this value rotates the domain in the trigonometric
  // direction). Defaults to `refLon` (no rotation).
  standLon?: number,
};

// Registers a proj4 Lambert Conformal Conic projection under the given name, such that (refLon, refLat)
// maps to (0, 0). This shift is a no-op when `standLon` equals `refLon`, but is required otherwise
// (e.g. when the domain is rotated), because proj4's implicit false origin sits at (standLon, refLat),
// which does not generally coincide with (refLon, refLat).
const registerWrfProjection = (name: string, projection: WrfProjection): void => {
  const trueLat2 = projection.trueLat2 ?? projection.trueLat1;
  const standLon = projection.standLon ?? projection.refLon;
  const unshifted = `+proj=lcc +lat_1=${projection.trueLat1} +lat_2=${trueLat2} +lat_0=${projection.refLat} +lon_0=${standLon} +a=${wrfSphericalEarthRadius} +b=${wrfSphericalEarthRadius} +units=m +no_defs`;
  const [x, y] = proj4('WGS84', unshifted, [projection.refLon, projection.refLat]) as [number, number];
  const shifted = `+proj=lcc +lat_1=${projection.trueLat1} +lat_2=${trueLat2} +lat_0=${projection.refLat} +lon_0=${standLon} +x_0=${-x} +y_0=${-y} +a=${wrfSphericalEarthRadius} +b=${wrfSphericalEarthRadius} +units=m +no_defs`;
  console.log(`Registering WRF projection ${name} with parameters: ${shifted}`);
  proj4.defs(name, shifted);
};

// Description of a coarse WRF domain and its nested domains, using the same variables as a &geogrid
// section of namelist.wps. Domain 1 (the coarse domain) is at index 0 of each array, domain 2 at index 1,
// and so on, so that values can be copy/pasted directly from namelist.wps.
type GeogridNamelist = WrfProjection & {
  // Resolution of the coarse domain (domain 1), in meters. Nested domains derive their own resolution
  // from `parentGridRatio`.
  dx: number,
  dy: number,
  // 1-based id of the parent domain (0 for the coarse domain itself)
  parentId: Array<number>,
  // ratio of the parent domain resolution to this domain's resolution (ignored for the coarse domain)
  parentGridRatio: Array<number>,
  // x and y index (1-based, in the parent domain grid) of this domain's lower-left corner (ignored for
  // the coarse domain)
  iParentStart: Array<number>,
  jParentStart: Array<number>,
  // grid size
  eWe: Array<number>, // grid points, x direction (west-east)
  eSn: Array<number>, // grid points, y direction (south-north)
};

// Extent of a domain (in meters), in the projected coordinate system defined by its `GeogridNamelist`
// (i.e., centered so that (refLon, refLat) is (0, 0)).
type DomainExtent = {
  west: number,
  east: number,
  south: number,
  north: number,
};

// Computes the extent of every domain described by a namelist, mirroring the geolocation logic used by
// WPS's geogrid program: the coarse domain is centered on (refLon, refLat), and each nested domain is
// positioned relative to its parent domain according to `iParentStart`/`jParentStart`, at a resolution
// scaled down by `parentGridRatio`.
const computeDomainExtents = (namelist: GeogridNamelist): Array<DomainExtent> => {
  const points = namelist.eSn.map((eSn, i) => eSn * namelist.eWe[i]).reduce((a, b) => a + b);
  console.log(`Number of points: ${points}`);
  const n = namelist.eWe.length;
  const resolutions: Array<{ dx: number, dy: number }> = new Array(n);
  const extents: Array<DomainExtent> = new Array(n);

  const resolve = (i: number): void => {
    if (extents[i] !== undefined) return;
    const parentId = namelist.parentId[i];
    if (parentId === 0) {
      resolutions[i] = { dx: namelist.dx, dy: namelist.dy };
      const west = -((namelist.eWe[i] - 1) * resolutions[i].dx) / 2;
      const south = -((namelist.eSn[i] - 1) * resolutions[i].dy) / 2;
      extents[i] = {
        west,
        south,
        east: west + (namelist.eWe[i] - 1) * resolutions[i].dx,
        north: south + (namelist.eSn[i] - 1) * resolutions[i].dy
      };
    } else {
      const parentIndex = parentId - 1;
      resolve(parentIndex);
      const parentResolution = resolutions[parentIndex];
      const dx = parentResolution.dx / namelist.parentGridRatio[i];
      const dy = parentResolution.dy / namelist.parentGridRatio[i];
      resolutions[i] = { dx, dy };
      const west = extents[parentIndex].west + (namelist.iParentStart[i] - 1) * parentResolution.dx;
      const south = extents[parentIndex].south + (namelist.jParentStart[i] - 1) * parentResolution.dy;
      extents[i] = {
        west,
        south,
        east: west + (namelist.eWe[i] - 1) * dx,
        north: south + (namelist.eSn[i] - 1) * dy
      };
    }
  };

  for (let i = 0; i < n; i++) resolve(i);
  return extents;
};

// Turns a domain extent into an OpenLayers feature, reprojected from the domain's projection (e.g. `WRF`
// or `WRF2`, must already be registered via `registerWrfProjection`) to the map's view projection. The
// polygon ring is densified (split into several segments per edge) so that it still looks like a
// quadrilateral once reprojected to a different, non-linear projection (e.g. Web Mercator).
const domainExtentFeature = (extent: DomainExtent, projectionName: string, domainIndex: number, segmentsPerEdge = 20): Feature => {
  const corners: Array<[number, number]> = [
    [extent.west, extent.south],
    [extent.east, extent.south],
    [extent.east, extent.north],
    [extent.west, extent.north],
    [extent.west, extent.south],
  ];
  const ring: Array<[number, number]> = [];
  for (let i = 0; i < corners.length - 1; i++) {
    const [x0, y0] = corners[i];
    const [x1, y1] = corners[i + 1];
    for (let s = 0; s < segmentsPerEdge; s++) {
      const t = s / segmentsPerEdge;
      ring.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
    }
  }
  ring.push(corners[corners.length - 1]);
  const polygon = new Polygon([ring]);
  polygon.transform(projectionName, viewProjection);
  return new Feature({ geometry: polygon, domainIndex });
};

// Builds a vector layer showing the extent of every domain described by `namelist`, projected with the
// given (already registered) proj4 projection name. The coarse domain (domain 1) is styled with a dashed
// outline, nested domains with a solid, filled outline.
const domainsLayer = (namelist: GeogridNamelist, projectionName: string, color: string): VectorLayer<VectorSource> => {
  const features = computeDomainExtents(namelist)
    .map((extent, i) => domainExtentFeature(extent, projectionName, i));
  return new VectorLayer({
    source: new VectorSource({ features }),
    style: (feature) => {
      const isCoarseDomain = feature.get('domainIndex') === 0;
      return new Style({
        stroke: new Stroke({ color, width: 2, lineDash: isCoarseDomain ? [8, 6] : undefined }),
        fill: new Fill({ color: isCoarseDomain ? 'rgba(0, 0, 0, 0)' : `${color}14` })
      });
    }
  });
};

// The domain currently used in production, using the `WRF` projection: a coarse domain at 6 km
// resolution, and three nested domains at 2 km resolution.
const wrfNamelist: GeogridNamelist = {
  trueLat1: 46,
  trueLat2: 46,
  refLat: 46,
  refLon: 10,
  standLon: 10,
  dx: 6000,
  dy: 6000,
  parentId:        [0,   1,   1,   1],
  parentGridRatio: [1,   3,   3,   3],
  iParentStart:    [1,  71,  63, 148],
  jParentStart:    [1,  80,  53,  90],
  eWe:             [265, 283, 130, 205],
  eSn:             [193, 157, 130, 148],
};

// Candidate new domain, using the `WRF2` projection: a coarse domain at 6 km resolution, and one nested
// domain at 2 km resolution, currently centered by default within the coarse domain (to be refined).
const wrf2Namelist: GeogridNamelist = {
  trueLat1: 45,
  trueLat2: 47,
  refLat: 46.5,
  refLon: 9,
  standLon: 29, // increase to rotate in trigonometric direction
  dx: 6000,
  dy: 6000,
  parentId:        [0,   1],
  parentGridRatio: [1,   3],
  iParentStart:    [1,  70],
  jParentStart:    [1,  48],
  eWe:             [265, 466],
  eSn:             [185, 229],
};

registerWrfProjection('WRF', wrfNamelist);
registerWrfProjection('WRF2', wrf2Namelist);
register(proj4);

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

export type MapHooks = {
  locationClicks: Accessor<MapBrowserEvent<any> | undefined>
  setPrimaryLayerSource: (url: string, projection: string, extent: Extent) => void
  hidePrimaryLayer: () => void
  setWindLayerSource: (url: string, minViewZoom: number, extent: Extent, maxZoom: number, tileSize: number) => void
  hideWindLayer: () => void
  enableWindNumericalValues: (value: boolean) => void
  showMarker: (latitude: number, longitude: number) => void
  hideMarker: () => void
  centerToUserLocation: (userLocation: UserLocation) => void
}

type UserLocation = {
  latitude: number
  longitude: number
  accuracy: number
};

export const initializeMap = (element: HTMLElement): MapHooks => {
  const minimumCurrentLocationRadiusPixels = 12;

  const baseLayer = new TileLayer({
    source: new XYZ({
      //url: kosmtikUrl,
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

  const userLocationFeature = new Feature();
  const userLocationCenterFeature = new Feature();
  const userLocationLayer = new VectorLayer({
    source: new VectorSource({ features: [userLocationFeature] }),
    visible: false,
    style: new Style({
      fill: new Fill({
        color: 'rgba(212, 0, 0, 0.12)',
      }),
      stroke: new Stroke({
        color: '#d40000',
        width: 2,
      }),
    }),
  });
  const userLocationCenterLayer = new VectorLayer({
    source: new VectorSource({ features: [userLocationCenterFeature] }),
    visible: false,
    style: new Style({
      image: new CircleStyle({
        radius: 4,
        fill: new Fill({
          color: '#d40000',
        }),
        stroke: new Stroke({
          color: 'white',
          width: 1,
        }),
      }),
    }),
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

  // Extent of the current production domains (`WRF` projection) and of the new candidate domains
  // (`WRF2` projection), for comparison.
  const wrfDomainsLayer = domainsLayer(wrfNamelist, 'WRF', '#1a73e8');
  const wrf2DomainsLayer = domainsLayer(wrf2Namelist, 'WRF2', '#ff3b30');

  const [location, zoom] = loadLocationAndZoom();
  const map = new Map({
    target: element,
    layers: [
      baseLayer,
      primaryLayer,
      secondaryLayer,
      userLocationLayer,
      userLocationCenterLayer,
      markerLayer,
      wrfDomainsLayer,
      wrf2DomainsLayer,
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

  const setUserLocationGeometry = (userLocation: UserLocation): void => {
    const center4326: [number, number] = [userLocation.longitude, userLocation.latitude];
    const resolution = map.getView().getResolution() ?? 1;
    const visibleRadiusMeters = Math.max(
      userLocation.accuracy,
      resolution * minimumCurrentLocationRadiusPixels
    );
    userLocationFeature.setGeometry(
      circularPolygon(center4326, Math.max(visibleRadiusMeters, 1), 128).transform('EPSG:4326', webMercatorProjection)
    );
    userLocationCenterFeature.setGeometry(new Point(fromLonLat(center4326, webMercatorProjection)));
    userLocationLayer.setVisible(true);
    userLocationCenterLayer.setVisible(true);
  };

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
        format: new MVT(),
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
          opacity: 0.7,
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
    },
    centerToUserLocation: (userLocation: UserLocation): void => {
      const view = map.getView();
      setUserLocationGeometry(userLocation);
      view.setCenter(fromLonLat([userLocation.longitude, userLocation.latitude], webMercatorProjection));
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
