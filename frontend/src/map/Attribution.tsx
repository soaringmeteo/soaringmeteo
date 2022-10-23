import { createSignal, JSX, Show } from 'solid-js'
import * as L from 'leaflet'
import { showDate } from '../data/ForecastMetadata'
import { useState } from '../State'
import { surfaceOverMap } from '../styles/Styles';

export const Attribution = (): JSX.Element => {

  const [state] = useState();

  const [isExpanded, expand] = createSignal(false);

  const size = 24;

  const expandButton =
    <div
      style={{
        ...surfaceOverMap,
        'cursor': 'pointer',
        display: 'inline-block',
        width: `${size}px`,
        height: `${size}px`,
        'line-height': `${size}px`,
        'text-align': 'center',
        'font-size': '20px',
        'border-radius': `${size / 2}px`,
        'background-color': 'white'
      }}
      onClick={ () => expand(true) }
    >
      i
    </div>;

  const attribution =
    <div>
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
            height: `${size}px`,
            'line-height': `${size}px`,
            padding: '0 0.5em',
            'border-radius': '4px',
            'background-color': 'white'
          }}
        >
          Model: { state.forecastMetadata.model }. Initialization: { showDate(state.forecastMetadata.init) }
        </div>
      </Show>
    </div>;

  L.DomEvent.disableClickPropagation(attribution);

  return attribution
};
