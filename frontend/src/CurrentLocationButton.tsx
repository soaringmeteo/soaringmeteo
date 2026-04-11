import type { Domain } from "./State";
import { JSX, Show } from "solid-js";
import { css } from "./css-hooks";
import { roundButtonStyle, surfaceOverMap } from "./styles/Styles";
import {useI18n} from "./i18n";

export const CurrentLocationButton = (props: { domain: Domain }): JSX.Element =>
  <Show when={ window.navigator.geolocation }>
    {(() => {
      const { m } = useI18n();
      return <span
        style={{
          display: 'block',
          margin: '3px'
        }}
      >
        <div
          style={css({
            ...surfaceOverMap,
            ...roundButtonStyle,
            'border': '1px solid lightgray',
            'box-sizing': 'border-box',
            'background-color': 'white',
            'display': 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            on: $ => [$('hover', { 'background-color': 'lightgray' })]
          })}
          onClick={ () => props.domain.centerMapOnClientLocation() }
          title={ m().mapCenterOnMyLocation() }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <circle cx="12" cy="12" r="6" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
        </div>
      </span>
    })()}
  </Show>;
