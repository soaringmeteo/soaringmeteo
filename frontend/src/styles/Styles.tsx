import hooks from "../css-hooks";

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
export const soundingWidth = 600;
// height of the period selector shown at the top of the screen
export const periodSelectorHeight = 35; // Day height + hour height + 2 (wtf)
// width of one time period in meteograms
export const meteogramColumnWidth = 37;

export const closeButton = {
  width: `${closeButtonSize}px`,
  height: `${closeButtonSize}px`,
  'line-height': `${closeButtonSize}px`,
  display: 'inline-block',
  cursor: 'pointer',
  'text-align': 'center',
  'border-radius': `${closeButtonSize / 2}px`,
  'font-size': '18px'
};

export const burgerPaddingStyle = { padding: '.5em .75em' }

export const burgerOptionStyle = hooks({
  ...burgerPaddingStyle,
  'line-height': '1.5',
  'font-family': 'sans-serif',
  'color': 'black',
  'hover': { 'background-color': 'lightGray' }
});

export const burgerBorderTopStyle = { 'border-top': '1px solid darkgray' };

export const buttonStyle = hooks({ padding: '0.3em 0.4em', cursor: 'pointer', border: 'thin solid darkGray', 'box-sizing': 'border-box', hover: { 'background-color': 'lightGray' } });
