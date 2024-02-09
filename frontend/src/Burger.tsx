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
import { css } from "./css-hooks";
import {useI18n} from "./i18n";

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

  const { m } = useI18n();
  const [areSettingsVisible, makeSettingsVisible] = createSignal(false);

  const staticEntries: Array<[() => string, string]> = [
    [() => m().menuAbout(),     '/'],
    [() => m().menuSupport(),   '/don.html'],
    [() => m().menuDocuments(), '/docs.html'],
    [() => m().menuSoarGFS(),   '/GFSw/googleMap.html'],
    [() => m().menuSoarWRF(),   '/soarWRF'],
  ];

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
          style={css({
            ...closeButton,
            position: 'absolute',
            top: '3px',
            right: '3px',
            hover: { 'background-color': 'darkgray' }
          } as JSX.CSSProperties)}
        >
          ⨯
        </div>
      </div>
      <LayersSelector domain={props.domain} />
      <div
        style={{...burgerOptionStyle, ...burgerBorderTopStyle, cursor: 'pointer' }}
        onClick={ () => makeSettingsVisible(true) }>
          ⚙ { m().menuSettings() }
      </div>
      {
        staticEntries.map(([label, href], i) => {
          const maybeBorderStyle = i === 0 ? burgerBorderTopStyle : {};
          return <a href={href} style={{ 'text-decoration': 'none' }}>
            <div style={{ ...burgerOptionStyle, ...maybeBorderStyle }}>{ label() }</div>
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
