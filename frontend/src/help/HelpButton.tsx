import type { Domain } from "../State";
import { createSignal, JSX, lazy } from "solid-js";
import { css } from "../css-hooks";
import { bottomButtonsSize, surfaceOverMap } from "../styles/Styles";
import { Overlay } from "../map/Overlay";

const Help = lazy(() => import('./Help').then(module => ({ default: module.Help })));

export const HelpButton = (props: { domain: Domain, overMap: boolean }): JSX.Element => {

    const [isVisible, makeVisible] = createSignal(false);

    const expandButton =
      <div style={css({
        ...(props.overMap ? surfaceOverMap : {}),
        'cursor': 'pointer',
        'user-select': 'none',
        display: 'inline-block',
        width: `${bottomButtonsSize}px`,
        height: `${bottomButtonsSize}px`,
        'line-height': `${bottomButtonsSize}px`,
        'text-align': 'center',
        'font-size': '18px',
        'border-radius': `${bottomButtonsSize / 2}px`,
        'border': '1px solid lightgray',
        'box-sizing': 'border-box',
        'background-color': 'white',
        hover: { 'background-color': 'lightgray' }
      })}
       onClick={ () => makeVisible(true) }
       title="Help"
      >
        ?
      </div>;

    return <span
      style={{
        display: 'block',
        margin: '3px'
      }}
    >
    { expandButton }
    <Overlay
      isVisible={ isVisible() }
      close={ () => makeVisible(false) }
      maxWidth='80em'
    >
      <span style="text-align: left">
        <Help domain={ props.domain } />
      </span>
    </Overlay>
  </span>;
};
