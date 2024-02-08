import { JSX, lazy, Match, Show, Switch } from 'solid-js'
import { keyWidth, meteogramColumnWidth, soundingWidth } from '../styles/Styles';
import * as fakeData from './data';
import { showDate, xcFlyingPotentialLayerName, inversionStyle } from '../shared';
import {type Domain, gfsModel, wrfModel} from '../State';

export const Help = (props: { domain: Domain }): JSX.Element => {
  const state = props.domain.state;
  return <Switch>
    <Match when={ state.detailedView === undefined || state.detailedView.viewType === 'summary' }>
      <MapHelp domain={props.domain} />
    </Match>
    <Match when={ state.detailedView !== undefined && state.detailedView.viewType === 'meteogram' }>
      <MeteogramHelp domain={props.domain} />
    </Match>
    <Match when={ state.detailedView !== undefined && state.detailedView.viewType === 'sounding' }>
      <SoundingHelp domain={props.domain} />
    </Match>
  </Switch>
}

const MapHelp = (props: { domain: Domain }): JSX.Element => {

  const state =  props.domain.state;

  return <>
    <p>
      Soaringmeteo is a free weather forecast website developed by passionate pilots. Please consider making
      a <a href='https://soaringmeteo.org/don.html'>donation</a> to help us cover our cost.
    </p>
    <p>
      What you see is the weather forecast for { showDate(state.forecastMetadata.dateAtHourOffset(state.hourOffset), { timeZone: props.domain.timeZone() }) },
      from the model { props.domain.modelName() } initialized at { showDate(state.forecastMetadata.init, { timeZone: props.domain.timeZone() }) }.
      <Switch>
        <Match when={ props.domain.state.model === gfsModel }>
          {' '}The results of the <a href="https://www.ncei.noaa.gov/products/weather-climate-models/global-forecast" target="_blank">GFS model</a> are provided by the <a
          href="https://www.noaa.gov/">NOAA</a>. The results are published every day around 07:00 and 19:00 CEST.
        </Match>
        <Match when={ props.domain.state.model === wrfModel }>
          {' '}We operate the <a href="https://www.mmm.ucar.edu/models/wrf" target="_blank">WRF model</a> on our own
          servers, and we configured it to cover the Alpine region. The results are published every day around 05:00,
          11:00, 17:00, and 23:00 CEST.
        </Match>
      </Switch>
    </p>
    <p>
      Use the top-left menu to select which information to display on the map (cross-country flying potential,
      thermal velocity, wind speed and direction, etc.). You can also select a different weather forecast model,
      or a different area of the world (tip: bookmark the page after you selected your favorite model and
      geographical zone).
    </p>
    <Show when={ state.primaryLayerEnabled }>
      <p>
        Currently, you see the <strong>{ state.primaryLayer.title }</strong>.
      </p>
    </Show>
    { props.domain.primaryLayerReactiveComponents().help }
    <Show when={ state.windLayerEnabled }>
      <p>
        You also see the <strong>{ state.windLayer.title }</strong>.
      </p>
      { props.domain.windLayerReactiveComponents().help }
    </Show>
    <p>
      Click on the map to see meteograms and sounding diagrams for that location. <strong>At any
      point, click on the help button again to get an explanation about what you currently see.</strong>
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
  })();

const lightTextStyle = (color: string) => ({
  color,
  'text-shadow': 'darkgray 1px 1px 1px'
});

const MeteogramHelp = (props: { domain: Domain }): JSX.Element => <>
  <p>
    Meteograms show the weather forecast for the selected location over time. Here is an
    example of three days meteogram that we made up for documentation purpose:
  </p>
  <div style={{ float: 'left', 'margin-right': '1em', 'min-width': `${ keyWidth * 2 + meteogramColumnWidth * 3 * 3 }px` }}>
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
    <b style={ lightTextStyle(inversionStyle) }>Purple strips</b> indicate inversion layers. Inversions are parts of the atmosphere where the air is very stable. They block thermals and the development of convective clouds.
  </p>
  <p>
    The <b>wind</b> and <b>clouds</b> are also shown in that diagram at various elevation levels. For
    instance, within the boundary layer, there is moderate wind the first two days (between 15 km/h
    and 30 km/h), and light wind the third day (5 to 15 km/h). The wind comes from the south the
    second day.
  </p>
  <Show when={ !props.domain.state.windNumericValuesShown }>
    <p>The wind is shown by wind barbs. The number of barb “flags”, in the
      arrow, indicates the speed with a precision of 2.5 km/h. For instance, an arrow
      with a single short flag indicate a speed between 0 and 2.5 km/h. If it has two
      short flags, it means a speed between 2.5 and 5 km/h. Two long flags mean a speed
      between 7.5 and 10 km/h. Four long flags mean a speed between 17.5 and 20 km/h,
      and so on. Alternatively, you can show the wind speed as a numerical value by going
      to the Settings from the top-left main menu.
    </p>
  </Show>
  <p>
    Cumulus clouds are shown by the <b>white cloud picture</b>. Soaring pilots can not fly higher
    than the cloud base. When there is no cloud picture at all, it means there will
    be “blue thermals”. The presence of cumulus clouds is a good thing to fly cross-country, but
    if they develop too high they can produce showers or thunderstorms.
  </p>
  <p>
    The cloud cover at various elevation levels is shown by the gray strips: the wider the
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
  })();

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
    mass, and a <b style={lightTextStyle('yellow')}>yellow line</b> means an absolutely unstable air mass. On
    the other hand, a <b style="color: #f0f">purple line</b> indicates an inversion layer.
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
