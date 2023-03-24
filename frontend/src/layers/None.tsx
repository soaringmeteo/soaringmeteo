import * as L from 'leaflet';
import { Renderer } from "../map/CanvasLayer";
import { Layer } from './Layer';

export const noLayer = new Layer({
  key: 'none',
  name: 'None',
  title: 'Map only',
  renderer: () => () => new NoneRenderer(),
  MapKey: () => <div />,
  Help: () => <p>This layer just shows the map.</p>
});

class NoneRenderer implements Renderer {

  constructor() {}
  renderPoint(lat: number, lng: number, averagingFactor: number, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {

  }
  summary(lat: number, lng: number, averagingFactor: number): Array<[string, string]> | undefined {
    return []
  }

}
