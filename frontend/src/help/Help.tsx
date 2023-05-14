import { createSignal, JSX, lazy, Match, Show, Switch } from 'solid-js'
import * as L from 'leaflet'
import { bottomButtonsSize, keyWidth, soundingWidth, surfaceOverMap } from '../styles/Styles';
import * as fakeData from './data';
import { showDate, xcFlyingPotentialLayerName } from '../shared';
import { type Domain } from '../State';

export const Help = (props: { domain: Domain }): JSX.Element => {

  const state = props.domain.state;
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
      title="Help"
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
              <MapHelp domain={props.domain} />
            </Match>
            <Match when={ state.detailedView !== undefined && state.detailedView[1] === 'meteogram' }>
              <MeteogramHelp domain={props.domain} />
            </Match>
            <Match when={ state.detailedView !== undefined && state.detailedView[1] === 'sounding' }>
              <SoundingHelp domain={props.domain} />
            </Match>
          </Switch>
        </div>
      </div>
    </Show>
  </span> as HTMLElement;

  L.DomEvent.disableClickPropagation(help);
  L.DomEvent.disableScrollPropagation(help);

  return help
};

const MapHelp = (props: { domain: Domain }): JSX.Element => {

  const state =  props.domain.state;

  return <>
    <p>
      Soaringmeteo is a free weather forecast website developed by passionate pilots. Please consider making
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
    { props.domain.primaryLayerReactiveComponents().help }
    <Show when={ state.windLayerEnabled }>
      <p>
        You also see the <strong>{ state.windLayer.title }</strong>.
      </p>
      { props.domain.windLayerReactiveComponents().help }
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

const lazyMeteogram = (props: { domain: Domain }): JSX.Element =>
  lazy<() => JSX.Element>(() => {
    return import('../diagrams/Meteogram').then(module => {
      const { key, view } = module.meteogram(fakeData.locationForecasts, props.domain.state);
      return { default: () => <>{ key }{ view }</> }
    })
  });

const lightTextStyle = (color: string) => ({
  color,
  'text-shadow': 'darkgray 1px 1px 1px'
});

const MeteogramHelp = (props: { domain: Domain }): JSX.Element => <>
  <p>
    Meteograms show the weather forecast for the selected location over time. Here is an
    example of three days meteogram that we made up for documentation purpose:
  </p>
  <div style={{ float: 'left', 'margin-right': '1em' }}>
    { lazyMeteogram({ domain: props.domain }) }
  </div>
  <p>
    The <b>top row</b> (“XC?”) shows the estimated cross-country flying potential (between 0% and 100%).
    The higher the number, the higher the chances to fly long distances. It takes into account the
    boundary layer depth, the average thermal velocity, the wind speed, and the sunshine. Select the
    layer “{ xcFlyingPotentialLayerName }” in the map view to learn more about how it works.
  </p>
  <p>
    The <b>second row</b> (“m/s”) shows the estimated average thermal velocity (in m/s) within the boundary layer.
    Values above 1 m/s usually mean that thermals should be just strong enough to stay in the air. Values
    above 2 m/s mean good thermals.
  </p>
  <p>
    Below those numbers, the “airgram” shows various properties of the air at the selected location
    over time. The scale on the left shows the altitude. In this example, it starts at { fakeData.groundLevel } m,
    which is the altitude of the selected location as seen by the current forecast model.
  </p>
  <p>
    The <b style={ lightTextStyle('mediumspringgreen') }>green area</b> shows
    the <a href="https://en.wikipedia.org/wiki/Planetary_boundary_layer" target="_blank">planetary
    boundary layer</a>, which is the part of the atmosphere where we can expect to find thermals
    and soar.
    In this example, we see that the boundary layer reaches { fakeData.groundLevel + fakeData.maxDepth } m in the middle of the
    last day. It is good to have a boundary layer of at least 750 m above the ground level to fly cross-country.
  </p>
  <p>
    The <b>wind</b> and <b>clouds</b> are also shown in that diagram at various elevation levels. For
    instance, within the boundary layer, there is moderate wind the first two days (between 15 km/h
    and 30 km/h), and light wind the third day (5 to 15 km/h). The wind comes from the south the
    second day. You can learn more about the wind barb by showing the help from within the map view,
    if there is a wind layer enabled.
  </p>
  <p>
    Cumulus clouds are shown by the <b>white cloud picture</b>. Soaring pilots can not fly higher
    than the cloud base. When there is no cloud picture at all, it means there will
    be “blue thermals”. The presence of cumulus clouds is a good thing to fly cross-country, but
    if they develop too high they can produce showers or thunderstorms.
  </p>
  <p>
    The cloud cover at various elevation levels is shown by the white or gray strips: the wider the
    strip, the more the cloud cover. If the strip takes half of the column, it means a cloud cover
    of 50%. If it takes the whole column, it means a cloud cover of 100%. Note that the high-level
    cloud cover is indicated at the topmost part of the diagram (when the vertical scale axis becomes
    discontinued). In our example, the sky will be quite cloudy the first day, especially at midday.
    The second day, there will be cumulus clouds. The third day, there will be few cumulus clouds, but
    cirrus clouds will come in the afternoon.
  </p>
  <p>
    The altitude of the isotherm 0°C is shown by the <b>black line</b>. In this example, it starts around
    3500 m the first day, and increases up to { fakeData.maxIso } m on the third day.
  </p>
  <p>
    Last, the atmospheric pressure is shown by the <b style="color: red">red line</b>. The scale is on the right of the
    diagram. Here, it oscillates around 1010 hPa.
  </p>
  <p>
    At the bottom, we see the evolution of the temperature on the ground (<b style="color: red">red line</b>) and the
    dew point temperature (<b style="color: blue">blue line</b>), and the amount of rainfalls. Convective rainfalls are
    shown in <b style={lightTextStyle('cyan')}>cyan</b>, and other rainfalls in <b style="color: blue">blue</b>. The scale for the rainfalls is on the left,
    and for the temperature on the right. In the example, a few millimeters of rain are expected
    the first day, and the air gets dryer the third day (the dew point temperature decreases).
  </p>
  <p>Last, the presence of a lightning picture indicates a risk of thunderstorm during the day. The larger the picture, the higher the risk of thunderstorm.</p>
  <p>
    According to this diagram, the best day for flying is the third day, although the wind may
    be a little bit too strong in the afternoon.
  </p>
</>;

const lazySounding = (props: { domain: Domain }): JSX.Element =>
  lazy<() => JSX.Element>(() => {
    return import('../diagrams/Sounding').then(module => {
      const { key, view } = module.sounding(fakeData.detailedForecast, fakeData.groundLevel, true, props.domain.state);
      return { default: () => <>{ key }{ view }</> }
    })
  });

const SoundingHelp = (props: { domain: Domain }): JSX.Element => <>
  <p>
    Sounding diagrams show the evolution of the temperature of the air with altitude (learn more
    about sounding diagrams <a href="https://soaringmeteo.org/profilEN.pdf" target="_blank">here</a>).
    Here is an example:
  </p>
  <div style={{ float: 'left', 'margin-right': '1em', 'min-width': `${ keyWidth + soundingWidth }px` }}>
    { lazySounding({ domain: props.domain }) }
  </div>
  <p>
    The horizontal axis shows the temperature, whereas the vertical axis shows the altitude.
    The <b>rightmost line</b> shows the evolution of the temperature of the air with altitude. A <b>black thin
    line</b> means a stable air mass, an <b style="color: orange">orange line</b> means a conditionally unstable air
    mass, and a <b style={lightTextStyle('yellow')}>yellow line</b> means an absolutely unstable air mass.
    The <b style="color: blue">blue line</b> shows the evolution of the dew point
    temperature with altitude.
  </p>
  <p>
    The <b style={lightTextStyle('mediumspringgreen')}>green area</b> shows the planetary boundary layer,
    which is the part of the atmosphere where we can expect to find thermals and soar.
  </p>
  <p>
    On the right, The <b>white or gray strips</b> indicate the cloud cover at various elevation
    levels. The wider the strip, the more the cloud cover. When the strip is as large as the
    right column, it means a cloud cover of 100%.
  </p>
  <p>
    The presence of cumulus
    clouds is shown by <b>white cloud picture</b>. The altitude of the cumulus clouds base is also
    written below the picture, on the right of the diagram.
  </p>
  <p>
    On the left, the wind speed and direction is shown at various elevation levels by the
    wind barb.
  </p>
  <p>
    The text “2.1 m/s” (in the middle of the soaring layer, on the right of the diagram) tells you the
    estimated average thermal velocity within the boundary layer. Values above 1 m/s usually mean
    that thermals should be just strong enough to stay in the air. Values above 2 m/s mean good thermals.
  </p>
  <p>
    By default, the diagram shows only the airmass within the boundary layer and a couple of thousand
    meters above it. You can expand the diagram to see the whole troposphere by clicking to the button
    on the top right corner.
  </p>
</>;
