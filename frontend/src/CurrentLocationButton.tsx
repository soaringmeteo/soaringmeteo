import type { Domain } from "./State";
import { JSX, Show } from "solid-js";
import { RoundIconButton } from "./RoundIconButton";
import {useI18n} from "./i18n";

export const CurrentLocationButton = (props: { domain: Domain }): JSX.Element =>
  <Show when={ window.navigator.geolocation }>
    {(() => {
      const { m } = useI18n();
      return <RoundIconButton
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
      </RoundIconButton>
    })()}
  </Show>;
