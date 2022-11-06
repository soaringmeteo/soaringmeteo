import * as L from "leaflet";
import { createSignal, JSX, Show } from "solid-js";
import { periodSelectorHeight } from "./styles/Styles";
import { useState } from './State';
import { surfaceOverMap } from "./styles/Styles";

/**
 * Burger menu with links to the other parts of the website.
 * 
 * The menu is hidden when a detailed view (meteogram or sounding)
 * is displayed.
 */
export const Burger = (): JSX.Element => {

  const [state] = useState();
  const [expanded, setExpanded] = createSignal(false);

  const menu =
    <div
      style={{
        ...surfaceOverMap,
        width: `${periodSelectorHeight}px`,
        height: `${periodSelectorHeight}px`,
        cursor: 'pointer',
        padding: '0.3em',
        border: 'thin solid darkGray',
        'box-sizing': 'border-box',
        'background-color': '#009688',
        color: '#fff',
        'text-align': 'center',
        'font-weight': 'bold',
        'font-size': '1.5em'
      }}
      onClick={() => { setExpanded(!expanded()); }}
    >☰</div>;
  L.DomEvent.disableClickPropagation(menu);

  const optionStyle = {
    padding: '8px 16px',
    'font-size': '15px',
    'line-height': '1.5',
    'font-family': 'sans-serif',
    'color': '#fff'
  };

  const entries = [
    ['⌂ Soaringmeteo',       'https://soaringmeteo.org/'],
    ['soarGFS',              'https://soaringmeteo.org/GFSw/googleMap.html'],
    ['soarWRF',              'https://soaringmeteo.org/soarWRF'],
    ['soarV2',               'https://soarwrf1.soaringmeteo.org/v2'],
    ['Documents',            'https://soaringmeteo.org/docs.html'],
    ['Support Soaringmeteo', 'https://soaringmeteo.org/don.html']
  ]

  const options =
    <div
      style={{
        ...surfaceOverMap,
        'background-color': '#009688',
        color: '#fff',
        'border-radius': '0 0 4px 0'
      }}
    >
      {
        entries.map(([label, href]) => {
          return <a href={href} style={{'text-decoration': 'none'}}><div style={optionStyle}>{label}</div></a>
        })
      }
    </div>;
  L.DomEvent.disableClickPropagation(options);

  return <Show when={ state.detailedView === undefined }>
    {menu}
    <Show when={expanded()}>
      {options}
    </Show>
  </Show>
};
