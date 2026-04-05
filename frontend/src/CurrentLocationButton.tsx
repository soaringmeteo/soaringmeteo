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
            on: $ => [$('hover', { 'background-color': 'lightgray' })]
          })}
          onClick={ () => props.domain.centerMapOnClientLocation() }
          title={ m().mapCenterOnMyLocation() }
        >
          ◎
        </div>
      </span>
    })()}
  </Show>;
