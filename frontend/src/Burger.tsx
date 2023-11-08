import {createSignal, JSX, Show} from "solid-js";
import { Domain } from "./State";
import {
  burgerBorderTopStyle,
  burgerOptionStyle,
  closeButton,
  closeButtonSize,
  periodSelectorHeight
} from "./styles/Styles";
import { surfaceOverMap } from "./styles/Styles";
import { Settings } from "./Settings";
import {LayersSelector} from "./LayersSelector";
import {OverlayContainer} from "./map/Overlay";

/**
 * Burger menu with links to the other parts of the website.
 * 
 * The menu is hidden when a detailed view (meteogram or sounding)
 * is displayed.
 */
export const Burger = (props: {
  domain: Domain
}): JSX.Element => {

  const state = props.domain.state;
  const [expanded, setExpanded] = createSignal(false);
  const [areSettingsVisible, makeSettingsVisible] = createSignal(false);

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

  const staticEntries = [
    ['About',                'https://soaringmeteo.org/'],
    ['Support Soaringmeteo', 'https://soaringmeteo.org/don.html'],
    ['Documents',            'https://soaringmeteo.org/docs.html'],
    ['soarGFS',              'https://soaringmeteo.org/GFSw/googleMap.html'],
    ['soarWRF',              'https://soaringmeteo.org/soarWRF'],
    ['soarV2',               'https://soarwrf1.soaringmeteo.org/v2']
  ]

  const options =
    <div
      style={{
        ...surfaceOverMap,
        'user-select': 'none',
        'background-color': '#E8EFFF',
        'border-radius': '0 0 4px 0',
        position: 'absolute',
        top: '0',
        left: '0',
        cursor: 'auto', // otherwise we would inherit the value from the overlay container
        'font-size': '0.9rem',
        'max-height': '100%',
        'overflow-y': 'scroll'
      }}
      onClick={ e => e.stopPropagation() }
    >
      <div
        style={{
          'background-color': '#009688',
          color: 'white'
        }}
      >
        <div
          style={{
            height: `${closeButtonSize + 6}px`,
            'line-height': `${closeButtonSize + 6}px`, // Trick to center text vertically
            'font-size': '1rem',
            'padding-left': '.5em'
        }}
        >
          Soaringmeteo
        </div>
        <div
          onClick={ () => setExpanded(false) }
          style={{
            ...surfaceOverMap,
            ...closeButton,
            position: 'absolute',
            top: '3px',
            right: '3px'
          }}
        >
          ⨯
        </div>
      </div>
      <LayersSelector domain={props.domain} />
      <div
        style={{...burgerOptionStyle, ...burgerBorderTopStyle, cursor: 'pointer' }}
        onClick={ () => makeSettingsVisible(true) }>
          ⚙ Settings
      </div>
      {
        staticEntries.map(([label, href], i) => {
          const maybeBorderStyle = i === 0 ? burgerBorderTopStyle : {};
          return <a href={href} style={{ 'text-decoration': 'none' }}>
            <div style={{ ...burgerOptionStyle, ...maybeBorderStyle }}>{label}</div>
          </a>
        })
      }
    </div>;

  // TODO Show the menu also when there is no detailed view
  return <Show when={ state.detailedView === undefined }>
    <Show when={ expanded() } fallback={ menuBtn }>
      <OverlayContainer handleClick={ () => setExpanded(false) }>
        {options}
      </OverlayContainer>
      <Settings
        isVisible={ areSettingsVisible() }
        close={ () => makeSettingsVisible(false) }
        domain={ props.domain }
      />
    </Show>
  </Show>
};
