import {createSignal, JSX, Show, lazy} from "solid-js";
import { Domain } from "./State";
import { periodSelectorHeight } from "./styles/Styles";
import { surfaceOverMap } from "./styles/Styles";

const Burger = lazy(() => import('./Burger').then(module => ({ default: module.Burger })));

/**
 * Burger menu with links to the other parts of the website.
 *
 * The menu is hidden when a detailed view (meteogram or sounding)
 * is displayed.
 */
export const BurgerButton = (props: {
  domain: Domain
}): JSX.Element => {

  const [expanded, setExpanded] = createSignal(false);

  const menuBtn =
    <div
      style={{
        ...surfaceOverMap,
        width: `${periodSelectorHeight}px`,
        height: `${periodSelectorHeight}px`,
        cursor: 'pointer',
        'user-select': 'none',
        padding: '3px',
        border: 'thin solid darkGray',
        'box-sizing': 'border-box',
        'background-color': '#009688',
        color: '#fff',
        'text-align': 'center',
        'font-weight': 'bold',
        'font-size': `${periodSelectorHeight / 2}px`,
        'line-height': `1.5`
      }}
      onClick={() => { setExpanded(!expanded()); }}
    >☰</div> as HTMLElement;

  return <Show when={ expanded() } fallback={ menuBtn }>
    <Burger domain={ props.domain } close={ () => setExpanded(false) } />
  </Show>
};
