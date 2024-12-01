import { JSX } from "solid-js";
import { Domain } from "./State";
import { Overlay } from "./map/Overlay";
import {Checkbox, Radio} from "./styles/Forms";
import {supportedLangsAndLabels, useI18n} from "./i18n";

/** User settings */
export const Settings = (props: {
  isVisible: boolean
  close: () => void
  domain: Domain
}): JSX.Element => {
  const { m, setLang, lang } = useI18n();
  return <Overlay
    isVisible={ props.isVisible }
    close={ () => props.close() }
    maxWidth='30em'
  >
    <h1 style={{ margin: '.1em 0' }}>{ m().menuSettings() }</h1>

    <fieldset style={{ 'margin-top': '.1em 0' }}>
      <legend>{ m().settingsLanguage() }</legend>
      <select onChange={ event => { setLang(event.currentTarget.value as any) } }>
        {
          supportedLangsAndLabels.map(([langTag, label]) => {
            return (langTag === lang()) ?
              <option value={ langTag } selected>{ label }</option> :
              <option value={ langTag }>{ label }</option>
          })
        }
      </select>
      {' '}<a href="https://github.com/soaringmeteo/soaringmeteo/blob/main/TRANSLATING.md" target="_blank">{ m().settingsHelpTranslate() }</a>
    </fieldset>

    <fieldset style={{ 'margin-top': '.1em' }}>
      <legend>{ m().settingsWind() }</legend>
      <p>{ m().settingsWindExplanation() }</p>
      <Checkbox
        label={ m().settingsWindShowNumericalValues() }
        title={ m().settingsWindShowNumericalValuesLegend() }
        checked={ props.domain.state.windNumericValuesShown }
        onChange={ value => props.domain.showWindNumericValues(value) }
        labelPosition='right'
      />
    </fieldset>

    <fieldset style={{ 'margin-top': '.1em' }}>
      <legend>{ m().settingsTime() }</legend>
      <p>{ m().settingsTimeExplanation() }</p>
      <Radio
        label={ m().settingsTimeUserTimezone() }
        labelPosition='right'
        title={ m().settingsTimeUserTimezoneLegend() }
        checked={ !props.domain.state.utcTimeShown }
        groupName='time'
        onChange={ () => props.domain.showUtcTime(false) }
      />
      <Radio
        label={ m().settingsTimeUTC() }
        labelPosition='right'
        title={ m().settingsTimeUTCLegend() }
        checked={ props.domain.state.utcTimeShown }
        groupName='time'
        onChange={ () => props.domain.showUtcTime(true) }
      />
    </fieldset>
    <fieldset style={{ 'margin-top': '.1em' }}>
      <legend>{ m().settingsMapKey() }</legend>
      <Checkbox
        label={ m().settingsShowMapKey() }
        checked={ props.domain.state.mapKeyShown }
        onChange={ value => props.domain.showMapKey(value) }
        labelPosition='right'
      />
    </fieldset>
  </Overlay>
};
