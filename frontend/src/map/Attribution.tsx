import { createSignal, JSX, Show } from 'solid-js'
import * as L from 'leaflet'
import { showDate } from '../data/ForecastMetadata'
import { useState } from '../State'
import { bottomButtonsSize, surfaceOverMap } from '../styles/Styles';

export const Attribution = (): JSX.Element => {

  const [state] = useState();

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
          Model: { state.forecastMetadata.model }. Initialization: { showDate(state.forecastMetadata.init) }
        </div>
      </Show>
    </span>;

  L.DomEvent.disableClickPropagation(attribution);

  return attribution
};
