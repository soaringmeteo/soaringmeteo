import { JSX, lazy, Match, Show, Switch } from 'solid-js'
import { keyWidth, meteogramColumnWidth, soundingWidth } from '../styles/Styles';
import * as fakeData from './data';
import { showDate, inversionStyle } from '../shared';
import {type Domain} from '../State';
import {useI18n} from "../i18n";
import {gfsName, wrfName} from "../data/Model";

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
  const { m } = useI18n();

  return <>
    <p>
      { m().helpIntro1() } <a href='https://soaringmeteo.org/don.html'>{ m().helpIntro2() }</a> { m().helpIntro3() }
    </p>
    <p>
      { m().helpCurrentForecast({
        forecastDate: showDate(state.forecastMetadata.dateAtHourOffset(state.hourOffset), { timeZone: props.domain.timeZone() }),
        model: props.domain.state.model.name === gfsName ? 'GFS' : 'WRF',
        initializationTime: showDate(state.forecastMetadata.init, { timeZone: props.domain.timeZone() }),
        resolution: props.domain.effectiveResolution()
      }) }
      <Switch>
        <Match when={ props.domain.state.model.name === gfsName }>
          {' '}{ m().helpGfsModel1() } <a href="https://www.ncei.noaa.gov/products/weather-climate-models/global-forecast" target="_blank">{ m().helpGfsModel2() }</a> { m().helpGfsModel3() } <a
          href="https://www.noaa.gov/" target="_blank">NOAA</a>. { m().helpGfsModel4() }
        </Match>
        <Match when={ props.domain.state.model.name === wrfName }>
          {' '}{ m().helpWrfModel1() } <a href="https://www.mmm.ucar.edu/models/wrf" target="_blank">{ m().helpWrfModel2() }</a> { m().helpWrfModel3() }
        </Match>
      </Switch>
    </p>
    <p>
      { m().helpBurgerMenu() }
    </p>
    <Show when={ state.primaryLayerEnabled }>
      <p>
        { m().helpOverlay() } <strong>{ state.primaryLayer.title() }</strong>.
      </p>
      { props.domain.primaryLayerReactiveComponents().help }
    </Show>
    <Show when={ state.windLayerEnabled }>
      <p>
        { m().helpWindLayer() } <strong>{ state.windLayer.title() }</strong>.
      </p>
      { props.domain.windLayerReactiveComponents().help }
    </Show>
    <p>
      { m().helpBottom1() }{' '}<strong>{ m().helpBottom2() }</strong>
    </p>
    <p>
      { m().helpFeedback1() } <a href='https://github.com/soaringmeteo/soaringmeteo/issues'>issue</a>.
      {' '}{ m().helpFeedback2() } <a href='mailto:equipe@soaringmeteo.org'>email</a>.
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

const MeteogramHelp = (props: { domain: Domain }): JSX.Element => {
  const { m } = useI18n();
  return <>
    <p>
      { m().helpMeteogramIntro() }
    </p>
    <div style={{ float: 'left', 'margin-right': '1em', 'min-width': `${ keyWidth * 2 + meteogramColumnWidth * 3 * 3 }px` }}>
      { lazyMeteogram({ domain: props.domain }) }
    </div>
    <p>
      { m().helpMeteogramTopRow1() } <b>{ m().helpMeteogramTopRow2() }</b> { m().helpMeteogramTopRow3() }
    </p>
    <p>
      { m().helpMeteogramScndRow1() } <b>{ m().helpMeteogramScndRow2() }</b> { m().helpMeteogramScndRow3() }
    </p>
    <p>
      { m().helpMeteogramAirgram({ groundLevel: fakeData.groundLevel }) }
    </p>
    <p>
      { m().helpMeteogramBoundaryLayer1() } <b style={ lightTextStyle('mediumspringgreen') }>{ m().helpMeteogramBoundaryLayer2() }</b>
      {' '}{ m().helpMeteogramBoundaryLayer3() } <a href="https://en.wikipedia.org/wiki/Planetary_boundary_layer" target="_blank">{ m().helpMeteogramBoundaryLayer4() }</a>,
      {' '}{ m().helpMeteogramBoundaryLayer5({ boundaryLayerDepth: fakeData.groundLevel + fakeData.maxDepth }) }
    </p>
    <p>
      { m().helpMeteogramInversion1() } <b style={ lightTextStyle(inversionStyle) }>{ m().helpMeteogramInversion2() }</b> { m().helpMeteogramInversion3() }
    </p>
    <p>
      { m().helpMeteogramAir1() } <b>{ m().helpMeteogramAir2() } </b> { m().helpMeteogramAir3() } <b>{ m().helpMeteogramAir4() } </b> { m().helpMeteogramAir5() }
    </p>
    <Show when={ !props.domain.state.windNumericValuesShown }>
      <p>
        { m().helpMeteogramWindBarbs() }
      </p>
    </Show>
    <p>
      { m().helpMeteogramCumulus1() } <b>{ m().helpMeteogramCumulus2() }</b> { m().helpMeteogramCumulus3() }
    </p>
    <p>
      { m().helpMeteogramCloudCover() }
    </p>
    <p>
      { m().helpMeteogramIsotherm1() } <b>{ m().helpMeteogramIsotherm2() }</b>. { m().helpMeteogramIsotherm3({ maxIso: fakeData.maxIso }) }
    </p>
    <p>
      { m().helpMeteogramPressure1() } <b style="color: red">{ m().helpMeteogramPressure2() }</b>. { m().helpMeteogramPressure3() }
    </p>
    <p>
      { m().helpMeteogramTemperature1() } (<b style="color: red">{ m().helpMeteogramTemperature2() }</b>)
      {' '}{ m().helpMeteogramTemperature3() } (<b style="color: blue">{ m().helpMeteogramTemperature4() }</b>),
      {' '}{ m().helpMeteogramTemperature5() } <b style={lightTextStyle('cyan')}>{ m().helpMeteogramTemperature6() }</b>,
      {' '}{ m().helpMeteogramTemperature7() } <b style="color: blue">{ m().helpMeteogramTemperature8() }</b>.
      {' '}{ m().helpMeteogramTemperature9() }
    </p>
    <p>{ m().helpMeteogramThunderstorm() }</p>
    <p>
      { m().helpMeteogramConclusion() }
    </p>
  </>
};

const lazySounding = (props: { domain: Domain }): JSX.Element =>
  lazy<() => JSX.Element>(() => {
    return import('../diagrams/Sounding').then(module => {
      const { key, view } = module.sounding(fakeData.detailedForecast, fakeData.groundLevel, true, props.domain.state);
      return { default: () => <>{ key }{ view }</> }
    })
  })();

const SoundingHelp = (props: { domain: Domain }): JSX.Element => {
  const { m } = useI18n();
  return <>
    <p>
      { m().helpSoundingIntro1() } <a href="https://soaringmeteo.org/profilEN.pdf" target="_blank">{ m().helpSoundingIntro2() }</a>).
      {' '}{ m().helpSoundingIntro3() }
    </p>
    <div style={{ float: 'left', 'margin-right': '1em', 'min-width': `${ keyWidth + soundingWidth }px` }}>
      { lazySounding({ domain: props.domain }) }
    </div>
    <p>
      { m().helpSounding01() } <b>{ m().helpSounding02() }</b> { m().helpSounding03() }
      {' '}<b>{ m().helpSounding04() }</b> { m().helpSounding05() } <b style="color: orange">{ m().helpSounding06() }</b>
      {' '}{ m().helpSounding07() } <b style={lightTextStyle('yellow')}>{ m().helpSounding08() }</b>
      {' '}{ m().helpSounding09() } <b style="color: #f0f">{ m().helpSounding10() }</b>
      {' '}{ m().helpSounding11() } <b style="color: blue">{ m().helpSounding12() }</b>
      {' '}{ m().helpSounding13() }
    </p>
    <p>
      { m().helpSoundingBoundaryLayer1() } <b style={lightTextStyle('mediumspringgreen')}>{ m().helpSoundingBoundaryLayer2() }</b>
      {' '}{ m().helpSoundingBoundaryLayer3() }
    </p>
    <p>
      { m().helpSoundingCloudCover1() } <b>{ m().helpSoundingCloudCover2() }</b> { m().helpSoundingCloudCover3() }
    </p>
    <p>
      { m().helpSoundingCumulus1() } <b>{ m().helpSoundingCumulus2() }</b>. { m().helpSoundingCumulus3() }
    </p>
    <p>
      { m().helpSoundingWind() }
    </p>
    <p>
      { m().helpSoundingThermalVelocity() }
    </p>
    <p>
      { m().helpSoundingExpand() }
    </p>
  </>
};
