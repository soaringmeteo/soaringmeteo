import { drawWindArrow } from "../shapes";
import { Forecast, modelResolution } from "../Forecast";
import * as L from 'leaflet';
import { ColorScale, Color } from "../ColorScale";

export class Mixed {

  constructor(readonly forecast: Forecast) {}

  renderPoint(map: L.Map, lat: number, lng: number, ctx: CanvasRenderingContext2D): void {
    const forecastAtPoint = this.forecast[`${lng},${lat}`];
    if (forecastAtPoint !== undefined) {
      const topLeft = map.latLngToContainerPoint([(lat + modelResolution / 2) / 100, (lng - modelResolution / 2) / 100]);
      const bottomRight = map.latLngToContainerPoint([(lat - modelResolution / 2) / 100, (lng + modelResolution / 2) / 100]);
      const center = map.latLngToContainerPoint([lat / 100, lng / 100]);
      const width = map.latLngToContainerPoint([lat / 100, (lng + modelResolution) / 100]).x - center.x;
      const height = map.latLngToContainerPoint([(lat - modelResolution) / 100, lng / 100]).y - center.y;
  
      // Boundary Layer Height
      const blh = forecastAtPoint.blh;
      const color = boundaryDepthColorScale.interpolate(blh);
      ctx.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.25)`;
      ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
  
      // Boundary Layer Wind
      drawWindArrow(ctx, center.x, center.y, width, `rgba(62, 0, 0, 0.25)`, forecastAtPoint.u, forecastAtPoint.v);
  
      // Cloud cover
      const cloudCover = forecastAtPoint.c;
      const cloudCoverCoeff = cloudCover.e / 100;
      const ch = 5;
      const hSpace = width / ch;
      const cv = 7;
      const vSpace = height / cv;
      Array.from({ length: ch }, (_, i) => {
        Array.from({ length: cv }, (_, j) => {
          const x = topLeft.x + hSpace * (i + 1 / 2);
          const y = topLeft.y + vSpace * (j + 1 / 2);
          ctx.fillStyle = `rgba(60, 60, 60, ${cloudCoverCoeff / 3})`;
          ctx.beginPath();
          ctx.arc(x, y, hSpace / 2, 0, Math.PI * 2);
          ctx.fill();
        });
      });
    }
  
  }
}

export const boundaryDepthColorScale = new ColorScale([
  [0, new Color(0xff, 0x00, 0x00)],
  [300, new Color(0xff, 0x7f, 0x00)],
  [600, new Color(0x00, 0xff, 0x00)],
  [1000, new Color(0x00, 0xff, 0xff)],
  [1500, new Color(0xff, 0xff, 0xff)]
]);

