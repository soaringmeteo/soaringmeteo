import * as L from "leaflet";
import { createSignal, JSX, Show } from "solid-js";
import { marginTop as periodSelectorHeight } from "./PeriodSelector";
import { useState } from './State';

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
        'font-size': '1.5em',
        'box-shadow': 'rgba(0, 0, 0, 0.14) 0px 2px 2px 0px, rgba(0, 0, 0, 0.12) 0px 3px 1px -2px, rgba(0, 0, 0, 0.2) 0px 1px 5px 0px',
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
    ['ⓘ Help',              'https://github.com/soaringmeteo/soaringmeteo/blob/main/README.md#usage'],
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
        'background-color': '#009688',
        color: '#fff',
        'box-shadow': 'rgba(0, 0, 0, 0.14) 0px 2px 2px 0px, rgba(0, 0, 0, 0.12) 0px 3px 1px -2px, rgba(0, 0, 0, 0.2) 0px 1px 5px 0px',
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
