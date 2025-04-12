import { css } from "../css-hooks";
import { JSX } from 'solid-js';

export const surfaceOverMap = {
  'box-shadow': 'rgba(0, 0, 0, 0.14) 0px 2px 2px 0px, rgba(0, 0, 0, 0.12) 0px 3px 1px -2px, rgba(0, 0, 0, 0.2) 0px 1px 5px 0px'
};

// size of the round buttons (help and close buttons)
export const roundButtonSize = 24;
// width of the left key shown on the diagrams
export const keyWidth = 40;
// width of the sounding diagrams
export const soundingWidth =
  Math.max(Math.min(600, document.documentElement.clientWidth - keyWidth), 250);

export const daySelectorHeight = 15;
export const hourSelectorHeight = 22;
// height of the period selector shown at the top of the screen
export const periodSelectorHeight = daySelectorHeight + hourSelectorHeight + 2 /* border */;
// available height in the viewport for drawing the diagrams (sounding and meteogram)
export const diagramsAvailableHeight =
  document.documentElement.clientHeight - periodSelectorHeight - 61 /* bottom time selector */ - 64 /* text information and help */ - 10 /* arbitrary margin */;

// width of one time period in meteograms
export const meteogramColumnWidth = 37;

export const roundButtonStyle: JSX.CSSProperties = {
  width: `${roundButtonSize}px`,
  height: `${roundButtonSize}px`,
  'line-height': `${roundButtonSize}px`,
  display: 'inline-block',
  cursor: 'pointer',
  'user-select': 'none',
  'text-align': 'center',
  'border-radius': `${roundButtonSize / 2}px`,
  'font-size': '18px'
};

export const burgerPaddingStyle = { padding: '.5em .75em' }

export const burgerOptionStyle = css({
  ...burgerPaddingStyle,
  'line-height': '1.5',
  'font-family': 'sans-serif',
  'color': 'black',
  on: $ => [$('hover', { 'background-color': 'lightGray' })]
});

export const burgerBorderTopStyle = { 'border-top': '1px solid darkgray' };

export const buttonBorderSizePx = 1;

export const buttonStyle = css({
  padding: '0.3em 0.4em',
  cursor: 'pointer',
  border: `${buttonBorderSizePx}px solid darkGray`,
  'box-sizing': 'border-box',
  'user-select': 'none',
  on: $ => [$('hover', { 'background-color': 'lightGray' })]
});

export const menuZIndex = 1000;
export const diagramsIndex = 100;
export const mapIndex = 10;
