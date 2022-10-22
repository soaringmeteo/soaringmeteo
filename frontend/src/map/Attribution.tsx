import { createSignal, JSX, Show } from 'solid-js'
import * as L from 'leaflet'
import { showDate } from '../data/ForecastMetadata'
import { useState } from '../State'

export const Attribution = (): JSX.Element => {

  const [state] = useState();

  const [isExpanded, expand] = createSignal(false);

  const size = 24;

  const expandButton =
    <div
      style={{
        'cursor': 'pointer',
        display: 'inline-block',
        width: `${size}px`,
        height: `${size}px`,
        'line-height': `${size}px`,
        'text-align': 'center',
        'font-size': '20px',
        'border-radius': `${size / 2}px`,
        'background-color': 'white',
        'box-shadow': 'rgba(0, 0, 0, 0.14) 0px 2px 2px 0px, rgba(0, 0, 0, 0.12) 0px 3px 1px -2px, rgba(0, 0, 0, 0.2) 0px 1px 5px 0px'
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
            'cursor': 'pointer',
            display: 'inline-block',
            height: `${size}px`,
            'line-height': `${size}px`,
            padding: '0 0.5em',
            'border-radius': '4px',
            'background-color': 'white',
            'box-shadow': 'rgba(0, 0, 0, 0.14) 0px 2px 2px 0px, rgba(0, 0, 0, 0.12) 0px 3px 1px -2px, rgba(0, 0, 0, 0.2) 0px 1px 5px 0px'
          }}
        >
          Model: { state.forecastMetadata.model }. Initialization: { showDate(state.forecastMetadata.init) }
        </div>
      </Show>
    </div>;

  L.DomEvent.disableClickPropagation(attribution);

  return attribution
};
