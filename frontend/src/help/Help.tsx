import { createSignal, JSX, lazy, Match, Show, Switch } from 'solid-js'
import * as L from 'leaflet'
import { useState } from '../State';
import { bottomButtonsSize, keyWidth, soundingWidth, surfaceOverMap } from '../styles/Styles';
import { xcFlyingPotentialLayer } from '../layers/ThQ';
import * as fakeData from './data';
import { showDate } from '../data/ForecastMetadata';

export const Help = (): JSX.Element => {

  const [state] = useState();
  const [isVisible, makeVisible] = createSignal(false);

  const expandButton =
    <div style={{
        ...surfaceOverMap,
        'cursor': 'pointer',
        display: 'inline-block',
        width: `${bottomButtonsSize}px`,
        height: `${bottomButtonsSize}px`,
        'line-height': `${bottomButtonsSize}px`,
        'text-align': 'center',
        'font-size': '18px',
        'border-radius': `${bottomButtonsSize / 2}px`,
        'background-color': 'white'
      }}
      onClick={ () => makeVisible(true) }
    >
      ?
    </div>;

  const help = <span>
    { expandButton }
    <Show
      when={ isVisible() }
    >
      <div
        style={{
          position: 'fixed',
          inset: '0',
          'background-color': 'rgb(0, 0, 0, 0.3)',
          cursor: 'pointer',
          'backdrop-filter': 'blur(5px)',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center'
        }}
        onClick={ () => makeVisible(false) }
      >
        <div
          style={{
            ...surfaceOverMap,
            'max-width': '80em',
            display: 'inline-block',
            'border-radius': '5px',
            'background-color': 'white',
            padding: '0 0.5em',
            'font-size': '1rem',
            cursor: 'auto',
            'overflow': 'scroll',
            'max-height': '90%'
          }}
          onClick={ e => e.stopPropagation() }
        >
          <Switch>
            <Match when={ state.detailedView === undefined }>
              <MapHelp />
            </Match>
            <Match when={ state.detailedView !== undefined && state.detailedView[1] === 'meteogram' }>
              <MeteogramHelp />
            </Match>
            <Match when={ state.detailedView !== undefined && state.detailedView[1] === 'sounding' }>
              <SoundingHelp />
            </Match>
          </Switch>
        </div>
      </div>
    </Show>
  </span>;

  L.DomEvent.disableClickPropagation(help);
  L.DomEvent.disableScrollPropagation(help);

  return help
};

const MapHelp = (): JSX.Element => {

  const [state] = useState();

  return <>
    <p>
      Soaringmeteo is a free weather forecast website developped by passionate pilots. Please consider making
      a <a href='https://soaringmeteo.org/don.html'>donation</a> to help us cover our cost.
    </p>
    <p>
      You are looking at the weather forecast for { showDate(state.forecastMetadata.dateAtHourOffset(state.hourOffset)) },
      from the model { state.forecastMetadata.model }. Select the information to display on the map
      by clicking on the “layers” button to the bottom right of the screen.
    </p>
    <p>
      Currently, you see the <strong>{ state.primaryLayer.title }</strong>.
    </p>
    { state.primaryLayer.help }
    <Show when={ state.windLayerEnabled }>
      <p>
        You also see the <strong>{ state.windLayer.title }</strong>.
      </p>
      { state.windLayer.help }
    </Show>
    <p>
      Click on the map to see meteograms and sounding diagrams for that location. <strong>At any
      point, click on the help button again to get an explanation about you currently see.</strong>
    </p>
    <p>
      Something is not working as expected? Please file an <a href='https://github.com/soaringmeteo/soaringmeteo/issues'>issue</a>.
      For other questions, send us an <a href='mailto:equipe@soaringmeteo.org'>email</a>.
    </p>
  </>
};

const lazyMeteogram =
  lazy<() => JSX.Element>(() =>
    import(/* webpackPrefetch: true */ '../diagrams/Meteogram').then(module => {
      const { key, view } = module.meteogram(fakeData.locationForecasts);
      return { default: () => <>{ key }{ view }</> }
    })
  );

const MeteogramHelp = (): JSX.Element => <>
  <p>
    Meteograms show the weather forecast for the selected location over time. Here is an
    example of three days meteogram that we made up for documentation purpose:
  </p>
  <div style={{ float: 'left', 'margin-right': '1em' }}>
    { lazyMeteogram() }
  </div>
  <p>
    The top row (“XC?”) shows the estimated cross-country flying potential (between 0% and 100%).
    The higher the number, the higher the chances to fly long distances. Select the
    layer “{ xcFlyingPotentialLayer.name }” in the map view to learn more about how it works.
  </p>
  <p>
    The second row (“m/s”) shows the estimated average thermal velocity (in m/s). Values above 1 m/s
    usually mean that thermals should be just strong enough to stay in the air. Values above 2 m/s
    mean good thermals.
  </p>
  <p>
    Below those numbers, the “airgram” shows various properties of the air at the selected location
    over time. The scale on the left shows the altitude. In this example, it starts at { fakeData.groundLevel } m,
    which is the altitude of the selected location as seen by the current forecast model.
  </p>
  <p>
    The <a href="https://en.wikipedia.org/wiki/Planetary_boundary_layer" target="_blank">planetary
    boundary layer</a> is shown in green. It tells us how high thermals will be at a given time.
    In this example, we see that they reach { fakeData.groundLevel + fakeData.maxDepth } m in the middle of the
    last day.
  </p>
  <p>
    The wind and clouds are also shown in that diagram at various elevation levels. For
    instance, within the boundary layer, there is moderate wind the first two days (between 15 km/h
    and 30 km/h), and light wind the third day (5 to 15 km/h). The wind comes from the south the
    second day. You can learn more about wind barbells by showing the help from within the map view,
    if there is a wind layer enabled.
  </p>
  <p>
    The sky will be quite cloudy the first day, especially at midday. The second day, there will
    be cumulus clouds. The third day, there will be few cumulus clouds, but some cirrus clouds.
  </p>
  <p>
    The altitude of the isotherm 0°C is shown by the black line. In this example, it starts around
    3500 m the first day, and increases up to { fakeData.maxIso } m on the third day.
  </p>
  <p>
    Last, the atmospheric pressure is shown by the red line. The scale is on the right of the
    diagram. Here, it oscillates around 1010 hPa.
  </p>
  <p>
    At the bottom, we see the evolution of the temperature on the ground (red line) and the
    dew point temperature (blue line), and the amount of rainfalls. Convective rainfalls are
    shown in cyan, and other rainfalls in blue. The scale for the rainfalls is on the left,
    and for the temperature on the right. In the example, a few millimeters of rain are expected
    the first day, and the air gets dryer the third day (the dew point temperature decreases).
  </p>
  <p>
    According to this diagram, the best day for flying is the third day, although the wind may
    be a little bit too strong in the afternoon.
  </p>
</>;

const lazySounding =
  lazy<() => JSX.Element>(() =>
    import(/* webpackPrefetch: true */ '../diagrams/Sounding').then(module => {
      const { key, view } = module.sounding(fakeData.detailedForecast, fakeData.groundLevel, true);
      return { default: () => <>{ key }{ view }</> }
    })
  );

const SoundingHelp = (): JSX.Element => <>
  <p>
    Sounding diagrams show the evolution of the temperature of the air with altitude (learn more
    about sounding diagrams <a href="https://soaringmeteo.org/profilEN.pdf" target="_blank">here</a>).
    Here is an example:
  </p>
  <div style={{ float: 'left', 'margin-right': '1em', 'min-width': `${ keyWidth + soundingWidth }px` }}>
    { lazySounding() }
  </div>
  <p>
    The horizontal axis shows the temperature, whereas the vertical axis shows the altitude. The
    rightmost line shows the evolution of the temperature of the air with altitude. A black thin line
    means a stable air mass, an orange line means a conditionally unstable air mass, and a yellow line
    means an absolutely unstable air mass. The blue line shows the evolution of the dew point
    temperature with altitude.
  </p>
  <p>
    The green area shows the boundary layer height. The white or gray areas show the presence of
    clouds. On the left, the wind speed and direction is shown at various altitude levels by the
    wind barbells.
  </p>
  <p>
    The text “2.5 m/s” (in the middle of the green area, on the right of the diagram) tells you the
    estimated average thermal velocity. Values above 1 m/s usually mean that thermals should be just
    strong enough to stay in the air. Values above 2 m/s mean good thermals.
  </p>
  <p>
    By default, the diagram shows only the airmass within the boundary layer and a couple of thousand
    meters above it. You can expand the diagram to see the whole troposphere by clicking to the button
    on the top right corner.
  </p>
</>;
