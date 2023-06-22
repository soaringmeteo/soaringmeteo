import { createSignal, JSX, Show } from 'solid-js'
import * as L from 'leaflet'
import { showDate } from '../shared'
import { bottomButtonsSize, surfaceOverMap } from '../styles/Styles';
import { Domain } from '../State';

export const Attribution = (props: { domain: Domain }): JSX.Element => {

  const [isExpanded, expand] = createSignal(false);

  const expandButton =
    <div
      style={{
        ...surfaceOverMap,
        'cursor': 'pointer',
        display: 'inline-block',
        width: `${bottomButtonsSize}px`,
        height: `${bottomButtonsSize}px`,
        'line-height': `${bottomButtonsSize}px`,
        'text-align': 'center',
        'font-size': '18px',
        'border-radius': `${bottomButtonsSize / 2}px`,
        'background-color': 'white',
        'font-family': 'serif'
      }}
      onClick={ () => expand(true) }
    >
      i
    </div>;

  const attribution =
    <span>
      <Show
        when={ isExpanded() }
        fallback={ expandButton }
      >
        <div
          onClick={ () => expand(false) }
          style={{
            ...surfaceOverMap,
            'cursor': 'pointer',
            display: 'inline-block',
            height: `${bottomButtonsSize}px`,
            'line-height': `${bottomButtonsSize}px`,
            padding: '0 0.5em',
            'border-radius': '4px',
            'background-color': 'white'
          }}
        >
          Model: { props.domain.state.forecastMetadata.model }. Initialization: { showDate(props.domain.state.forecastMetadata.init, { timeZone: props.domain.timeZone() }) }
        </div>
      </Show>
    </span> as HTMLElement;

  L.DomEvent.disableClickPropagation(attribution);

  return attribution
};
