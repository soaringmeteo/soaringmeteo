import { css } from "../css-hooks";

export const surfaceOverMap = {
  'box-shadow': 'rgba(0, 0, 0, 0.14) 0px 2px 2px 0px, rgba(0, 0, 0, 0.12) 0px 3px 1px -2px, rgba(0, 0, 0, 0.2) 0px 1px 5px 0px'
};

// size of the buttons at the bottom of the screen (info and help)
export const bottomButtonsSize = 24;
// size of the button used for closing panels
export const closeButtonSize = 24;
// width of the left key shown on the diagrams
export const keyWidth = 40;
// width of the sounding diagrams
export const soundingWidth =
  Math.max(Math.min(600, document.documentElement.clientWidth - keyWidth), 250);

// available height in the viewport for drawing the diagrams (sounding and meteogram)
export const diagramsAvailableHeight =
  document.documentElement.clientHeight - 35 /* top time selector */ - 52 /* bottom time selector */ - 58 /* text information and help */ - 5;

// height of the period selector shown at the top of the screen
export const periodSelectorHeight = 13 /* day height */ + 22 /* hour height */;
// width of one time period in meteograms
export const meteogramColumnWidth = 37;

export const closeButton = {
  width: `${closeButtonSize}px`,
  height: `${closeButtonSize}px`,
  'line-height': `${closeButtonSize}px`,
  display: 'inline-block',
  cursor: 'pointer',
  'user-select': 'none',
  'text-align': 'center',
  'border-radius': `${closeButtonSize / 2}px`,
  'font-size': '18px'
};

export const burgerPaddingStyle = { padding: '.5em .75em' }

export const burgerOptionStyle = css({
  ...burgerPaddingStyle,
  'line-height': '1.5',
  'font-family': 'sans-serif',
  'color': 'black',
  'hover': { 'background-color': 'lightGray' }
});

export const burgerBorderTopStyle = { 'border-top': '1px solid darkgray' };

export const buttonStyle = css({ padding: '0.3em 0.4em', cursor: 'pointer', border: 'thin solid darkGray', 'box-sizing': 'border-box', 'user-select': 'none', hover: { 'background-color': 'lightGray' } });
