import * as L from 'leaflet';
import { modelResolution } from '../data/LocationForecasts';

export type CanvasLayer = {
  setRenderers(primaryRenderer: Renderer, windRenderer: undefined | Renderer): void
}

/** A specific view of the forecast output (e.g., wind, XC flying potential, etc.) */
export type Renderer = {
  /** Render one point of the forecast on the map */
  renderPoint(lat: number, lng: number, averagingFactor: number, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void
}

export const CanvasLayer = L.Layer.extend({

  onAdd: function(map: L.Map) {
    this._map = map;
    const pane = map.getPane(this.options.pane);
    if (pane !== undefined) {
      this._canvas = L.DomUtil.create('canvas', 'leaflet-layer');
      const size = map.getSize();
      this._canvas.width = size.x;
      this._canvas.height = size.y;
      pane.appendChild(this._canvas)
      map.on('moveend viewreset', this._update, this);
      map.on('resize', (e) => {
        this._canvas.width = e.newSize.x;
        this._canvas.height = e.newSize.y;
      });
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
    if (this._renderers === undefined || this._canvas === undefined) {
      return
    }
    const map: L.Map = this._map as L.Map;
    const topLeftPixel: [number, number] = [0, 0];
    L.DomUtil.setPosition(this._canvas, map.containerPointToLayerPoint(topLeftPixel));
    const topLeftCoordinates = map.containerPointToLatLng(topLeftPixel);
    const bottomRightCoordinates = map.containerPointToLatLng(map.getSize());
    const ctx = this._canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

    // When the user uses a zoom level lower than 7, we average the data to not
    // show lots of small points.
    const averagingFactor = 1 << Math.max(0, 7 - map.getZoom()); // e.g., 1, 2, 4, 8, etc.
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

    const [primaryRenderer, maybeWindRenderer]: [Renderer, Renderer | undefined] = this._renderers;

    let lng = minLng;
    while (lng <= maxLng) {
      let lat = minLat;
      while (lat <= maxLat) {
        const topLeft =
          map.latLngToContainerPoint(
            [(lat + viewResolution / 2) / 100, (lng - viewResolution / 2) / 100]
          );
        const bottomRight =
          map.latLngToContainerPoint(
            [(lat - viewResolution / 2) / 100, (lng + viewResolution / 2) / 100]
          );
        primaryRenderer.renderPoint(lat, lng, averagingFactor, topLeft, bottomRight, ctx);
        if (maybeWindRenderer !== undefined) {
          maybeWindRenderer.renderPoint(lat, lng, averagingFactor, topLeft, bottomRight, ctx);
        }
        lat = lat + viewResolution;
      }
      lng = lng + viewResolution;
    }
  },

  setRenderers(primaryRenderer: Renderer, windRenderer: undefined | Renderer): void {
    this._renderers = [primaryRenderer, windRenderer];
    this._update();
  }

});
