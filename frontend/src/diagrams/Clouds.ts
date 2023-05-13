import { ColorScale, Color } from "../ColorScale";
import { type Diagram } from "./Diagram";

export const drawCloudCover = (
  diagram: Diagram,
  maxWidth: number,
  cloudCover: number, // between 0 and 1
  centerX: number,
  bottomY: number,
  topY: number
): void => {
  // Show the cloud cover only if it is at least 1/8
  if (cloudCover >= 0.125) {
    const width = maxWidth * cloudCover;
    diagram.fillRect(
      [centerX - width / 2, bottomY],
      [centerX + width / 2, topY],
      cloudsColorScale.closest(cloudCover).css()
    );
  }
};

export const cloudsColorScale = new ColorScale([
  [0.25, new Color(0xf0, 0xf0, 0xf0, 0.75)],
  [0.50, new Color(0xe0, 0xe0, 0xe0, 0.75)],
  [0.75, new Color(0xd0, 0xd0, 0xd0, 0.75)],
  [1.00, new Color(0xc0, 0xc0, 0xc0, 0.75)],
]);
