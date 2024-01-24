import {createSignal, JSX} from "solid-js";
import { Domain } from "./State";
import {
  burgerBorderTopStyle,
  burgerOptionStyle,
  closeButton,
  closeButtonSize,
} from "./styles/Styles";
import { surfaceOverMap } from "./styles/Styles";
import { Settings } from "./Settings";
import {LayersSelector} from "./LayersSelector";
import {OverlayContainer} from "./map/Overlay";
import hooks from "./css-hooks";

/**
 * Burger menu with links to the other parts of the website.
 * 
 * The menu is hidden when a detailed view (meteogram or sounding)
 * is displayed.
 */
export const Burger = (props: {
  domain: Domain
  close: () => void
}): JSX.Element => {

  const [areSettingsVisible, makeSettingsVisible] = createSignal(false);

  const staticEntries = [
    ['About',                '/'],
    ['Support Soaringmeteo', '/don.html'],
    ['Documents',            '/docs.html'],
    ['soarGFS (legacy)',     '/GFSw/googleMap.html'],
    ['soarWRF (legacy)',     '/soarWRF'],
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
        'overflow-y': 'auto'
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
          onClick={ () => props.close() }
          style={hooks({
            ...closeButton,
            position: 'absolute',
            top: '3px',
            right: '3px',
            hover: { 'background-color': 'darkgray' }
          })}
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

  return <>
    <OverlayContainer handleClick={ () => props.close() }>
      {options}
    </OverlayContainer>
    <Settings
      isVisible={ areSettingsVisible() }
      close={ () => makeSettingsVisible(false) }
      domain={ props.domain }
    />
  </>
};
