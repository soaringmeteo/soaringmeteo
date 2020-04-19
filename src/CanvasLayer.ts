import * as L from 'leaflet';
import { modelResolution } from './Forecast';

export type CanvasLayer = {
  setDataSource(dataSource: DataSource): void
}

export type DataSource = {
  renderPoint: (map: L.Map, lat: number, lng: number, ctx: CanvasRenderingContext2D) => void
}

export const CanvasLayer = L.Layer.extend({

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

    // Find the top-left coordinates that are just _before_ the top-left pixel
    // We work in degrees * 100 instead of just degrees because we _need_ exact
    // arithmetic to do our look up in the forecast data
    const leftLng = Math.round(topLeftCoordinates.lng * 100); // e.g., 728 for Wispile
    const minX = (Math.round(leftLng / modelResolution) + (leftLng < 0 ? -1 : 0));

    const topLat = Math.round(topLeftCoordinates.lat * 100) // e.g., 4643 for Wispile
    const topLat0 = (Math.round(topLat / modelResolution) + (topLat < 0 ? 0 : 1));
    const rightLng = Math.round(bottomRightCoordinates.lng * 100);
    const maxX = (Math.round(rightLng / modelResolution) + (rightLng < 0 ? 0 : 1));

    const bottomLat = Math.round(bottomRightCoordinates.lat * 100);
    const bottomLat0 = (Math.round(bottomLat / modelResolution) + (bottomLat < 0 ? -1 : 0));

    Array.from({ length: maxX - minX }, (_, x: number) => {
      const lng = (minX + x) * modelResolution;
      Array.from({ length: topLat0 - bottomLat0 }, (_, y: number) => {
        const lat = (bottomLat0 + y) * modelResolution;
        this._dataSource.renderPoint(map, lat, lng, ctx);
      })
    })
  },

  setDataSource: function (dataSource: DataSource): void {
    this._dataSource = dataSource;
    this._update();
  }

});
