import * as L from 'leaflet';
import { modelResolution, ForecastMetadata, ForecastData, Forecast } from './Forecast';

export type CanvasLayer = {
  setDataSource(dataSource: DataSource): void
}

export type DataSource = {
  forecast: Forecast
  renderPoint: (forecastData: ForecastData, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D) => void
}

export const CanvasLayer = (forecastMetadata: ForecastMetadata) => L.Layer.extend({

  onAdd: function(map: L.Map) {
    this._map = map;
    const pane = map.getPane(this.options.pane);
    if (pane !== undefined) {
      this._canvas = L.DomUtil.create('canvas', 'leaflet-layer');
      const size = map.getSize();
      // TODO update on resize
      this._canvas.width = size.x;
      this._canvas.height = size.y;
      pane.appendChild(this._canvas)
      map.on('moveend viewreset', this._update, this);
      this._update()
    }
    return this
  },

  onRemove: function (map: L.Map) {
    if (this._canvas !== undefined) {
      L.DomUtil.remove(this._canvas);
      map.off('moveend viewreset', this._update, this);
    }
  },

  _update: function () {
    if (this._dataSource === undefined || this._canvas === undefined) {
      return
    }
    const map: L.Map = this._map as L.Map;
    const topLeftPixel: [number, number] = [0, 0];
    L.DomUtil.setPosition(this._canvas, map.containerPointToLayerPoint(topLeftPixel));
    const topLeftCoordinates = map.containerPointToLatLng(topLeftPixel);
    const bottomRightCoordinates = map.containerPointToLatLng(map.getSize());
    const ctx = this._canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

    // When the user uses a zoom level lower than 8, we average the data to not
    // show lots of small points.
    const averagingFactor = 1 << Math.max(0, 8 - map.getZoom()); // e.g., 1, 2, 4, 8, etc.
    const viewResolution = modelResolution * averagingFactor; // e.g., 25, 50, 100, 200, etc.

    // Find the top-left coordinates that are just _before_ the top-left pixel
    // We work in degrees * 100 instead of just degrees because we _need_ exact
    // arithmetic to do our look up in the forecast data
    const leftLng = Math.round(topLeftCoordinates.lng * 100); // e.g., 728 for Wispile
    const minLng = (Math.round(leftLng / viewResolution) + (leftLng < 0 ? -1 : 0)) * viewResolution;

    const rightLng = Math.round(bottomRightCoordinates.lng * 100);
    const maxLng = (Math.round(rightLng / viewResolution) + (rightLng < 0 ? 0 : 1)) * viewResolution;

    const topLat = Math.round(topLeftCoordinates.lat * 100) // e.g., 4643 for Wispile
    const maxLat = (Math.round(topLat / viewResolution) + (topLat < 0 ? 0 : 1)) * viewResolution;

    const bottomLat = Math.round(bottomRightCoordinates.lat * 100);
    const minLat = (Math.round(bottomLat / viewResolution) + (bottomLat < 0 ? -1 : 0)) * viewResolution;

    let lng = minLng;
    while (lng <= maxLng) {
      let lat = minLat;
      while (lat <= maxLat) {
        const point = viewPoint(this._dataSource.forecast, averagingFactor, lat, lng);
        if (point !== undefined) {
          const topLeft = map.latLngToContainerPoint([(lat + viewResolution / 2) / 100, (lng - viewResolution / 2) / 100]);
          const bottomRight = map.latLngToContainerPoint([(lat - viewResolution / 2) / 100, (lng + viewResolution / 2) / 100]);
          this._dataSource.renderPoint(point, topLeft, bottomRight, ctx);
        }
        lat = lat + viewResolution;
      }
      lng = lng + viewResolution;
    }
  },

  setDataSource: function (dataSource: DataSource): void {
    this._dataSource = dataSource;
    this._update();
  },

  getAttribution: function (): String {
    return `Data initialization: ${forecastMetadata.init.toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}`
  }

});

/**
 * @param averagingFactor 1, 2, 4, 8, etc.
 * @param lat             Hundreth of degrees (e.g. 4675)
 * @param lng             Hundreth of degrees (e.g. 7250)
 */
const viewPoint = (forecast: Forecast, averagingFactor: number, lat: number, lng: number): ForecastData | undefined => {
  // According to the zoom level, users see the actual points, or
  // an average of several points.
  const points: Array<ForecastData> = [];
  let i = 0;
  while (i < averagingFactor) {
    let j = 0;
    while (j < averagingFactor) {
      const point = forecast[`${lng + i * modelResolution},${lat + i * modelResolution}`];
      if (point !== undefined) {
        points.push(point);
      }
      j = j + 1;
    }
    i = i + 1;
  }
  if (points.length == 1) {
    return points[0]
  } else if (points.length > 1) {
    const sumPoint: ForecastData = {
      blh: 0,
      u: 0,
      v: 0,
      c: 0
    };
    points.forEach(point => {
      sumPoint.blh += point.blh;
      sumPoint.u += point.u;
      sumPoint.v += point.v;
      sumPoint.c += point.c;
    })
    const n = points.length;
    return {
      blh: sumPoint.blh / n,
      u: sumPoint.u / n,
      v: sumPoint.v / n,
      c: sumPoint.c / n
    };          
  } else {
    return
  }
};
