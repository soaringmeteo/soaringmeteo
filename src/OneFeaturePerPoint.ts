import * as L from "leaflet";
import {boundaryDepthColorScale} from "./ColorScale";
import {rotateShape} from "./shapes";

const canvas = L.canvas()

export const addLayer = (map: L.Map): void => {

  Array.from({ length: 15 * 4 }, (_, i: number) => {
    const lon = i / 4;
    Array.from({ length: 10 * 4 }, (_, j: number) => {
      const lat = j / 4 + 40;
      const coordinates = [L.latLng(lat - 0.125, lon - 0.125), L.latLng(lat + 0.125, lon - 0.125), L.latLng(lat + 0.125, lon + 0.125), L.latLng(lat - 0.125, lon + 0.125)];
      const boundaryLayerDepth = Math.abs(2 * Math.sin(-lon / 6)) * (Math.random() / 2) * Math.abs(Math.cos(lat / 5))

      const windDirection = (lon + lat) / 2 + Math.random() * 100;
      const windForce     = ((lon + 2 * lat) + Math.random() * 150) / 8;

      const sunshine = (3 * (lat - 10 + lon) + Math.random() * 150) * 3 // W/m²

      const color = boundaryDepthColorScale.interpolate(boundaryLayerDepth).css()

      // Boundary Layer
      L.polygon(
        coordinates,
        {
          color: color,
          stroke: false,
          fillOpacity: 0.25,
          renderer: canvas
        }
      ).addTo(map);

      // Wind
      L.polyline(
        Array.of<Array<[number, number]>>(
          [
            [lat - 0.08, lon],
            [lat + 0.08, lon]
          ],
          [
            [lat, lon - 0.08],
            [lat + 0.08, lon],
            [lat, lon + 0.08]
          ]
        ).map(path => rotateShape(path, [lat, lon], windDirection * 2 * Math.PI / 360)),
        {
          color: 'black',
          weight: windForce,
          opacity: 0.30,
          renderer: canvas
        }
      ).addTo(map);

      // Sunshine
      Array.of<[number, number]>(
        [lat - 0.08, lon - 0.08],
        [lat - 0.08, lon],
        [lat - 0.08, lon + 0.08],
        [lat, lon - 0.08],
        [lat, lon],
        [lat, lon + 0.08],
        [lat + 0.08, lon - 0.08],
        [lat + 0.08, lon],
        [lat + 0.08, lon + 0.08]
      ).forEach((latLon: [number, number]) => {
        L.circle(latLon, {
          stroke: false,
          color: 'white',
          radius: (900 / sunshine) * 1000,
          fillOpacity: 0.50,
          renderer: canvas
        }).addTo(map)
      });

    })
  })
}
