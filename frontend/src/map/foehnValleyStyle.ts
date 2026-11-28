import { FeatureLike } from 'ol/Feature';
import { LineString, Point } from 'ol/geom';
import { Fill, RegularShape, Stroke, Style } from 'ol/style';

const colorWithOpacity = (hex: string, alpha: number): string => {
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

export const foehnValleyStyle = (feature: FeatureLike): Array<Style> => {
  const color = feature.get('foehn') === 'north' ? '#2c3fb0' : '#d7261e';
  const rawIndex = feature.get('foehnIndex');
  const hasIndex = typeof rawIndex === 'number';
  const index = hasIndex ? Math.max(0, Math.min(1, rawIndex)) : 1;
  const width = hasIndex ? 1.5 + 5.5 * index : 2.5;
  const opacity = hasIndex ? 0.25 + 0.75 * index : 1;
  const styles = [
    new Style({
      stroke: new Stroke({ color: `rgba(255, 255, 255, ${0.8 * opacity})`, width: width + 2.5, lineCap: 'round' })
    }),
    new Style({
      stroke: new Stroke({
        color: colorWithOpacity(color, opacity),
        width,
        lineCap: 'round',
        lineDash: feature.get('style') === 'dotted' ? [6, 6] : undefined
      })
    })
  ];
  const geometry = feature.getGeometry();
  if (geometry instanceof LineString) {
    const coordinates = geometry.getCoordinates();
    if (coordinates.length >= 2) {
      const [x0, y0] = coordinates[coordinates.length - 2];
      const [x1, y1] = coordinates[coordinates.length - 1];
      styles.push(new Style({
        geometry: new Point([x1, y1]),
        image: new RegularShape({
          points: 3,
          radius: hasIndex ? 4 + 3 * index : 7,
          fill: new Fill({ color: colorWithOpacity(color, opacity) }),
          stroke: new Stroke({ color: 'white', width: 1 }),
          rotation: Math.atan2(x1 - x0, y1 - y0),
          rotateWithView: true
        })
      }));
    }
  }
  return styles;
};
