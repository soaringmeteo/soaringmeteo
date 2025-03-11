import type { Domain } from "../State";
import { createSignal, JSX, lazy } from "solid-js";
import { css } from "../css-hooks";
import { roundButtonStyle, surfaceOverMap } from "../styles/Styles";
import { Overlay } from "../map/Overlay";
import {useI18n} from "../i18n";

const Help = lazy(() => import('./Help').then(module => ({ default: module.Help })));

export const HelpButton = (props: { domain: Domain, overMap: boolean }): JSX.Element => {

    const { m } = useI18n();
    const [isVisible, makeVisible] = createSignal(false);

    const expandButton =
      <div style={css({
        ...(props.overMap ? surfaceOverMap : {}),
        ...roundButtonStyle,
        'border': '1px solid lightgray',
        'box-sizing': 'border-box',
        'background-color': 'white',
        on: $ => [$('hover', { 'background-color': 'lightgray' })]
      })}
       onClick={ () => makeVisible(true) }
       title={ m().help() }
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
