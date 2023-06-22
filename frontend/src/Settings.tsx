import { JSX } from "solid-js";
import { Domain } from "./State";
import { Overlay } from "./map/Overlay";
import { Radio } from "./styles/Forms";

/** User settings */
export const Settings = (props: {
  isVisible: boolean
  close: () => void
  domain: Domain
}): JSX.Element =>
  <Overlay
    isVisible={ props.isVisible }
    close={ () => props.close() }
    maxWidth='30em'
  >
    <h1 style={{ margin: '.1em 0' }}>Settings</h1>

    <fieldset style={{ 'margin-top': '.1em 0' }}>
      <legend>Wind</legend>
      <p>The wind speed can be indicated by either wind barbs or a numerical value in km/h. Wind barbs are a visual way of representing the wind speed by increments of 2.5 km/h. See the help for more information on how to interpret the barbs.</p>
      <Radio
        label='Show wind barbs'
        labelPosition='right'
        title='Show wind barbs instead of showing numerical values'
        checked={ !props.domain.state.windNumericValuesShown }
        groupName='barbs-vs-numerical'
        onChange={ () => props.domain.showWindNumericValues(false) }
      />
      <Radio
        label='Show numerical values'
        labelPosition='right'
        title='Show numerical values instead of showing wind barbs'
        checked={ props.domain.state.windNumericValuesShown }
        groupName='barbs-vs-numerical'
        onChange={ () => props.domain.showWindNumericValues(true) }
      />
    </fieldset>

    <fieldset style={{ 'margin-top': '.1em' }}>
      <legend>Time</legend>
      <p>The time can be displayed according to your timezone, or in UTC.</p>
      <Radio
        label='Show time using my current timezone'
        labelPosition='right'
        title='Show time using my current timezone instead of UTC'
        checked={ !props.domain.state.utcTimeShown }
        groupName='time'
        onChange={ () => props.domain.showUtcTime(false) }
      />
      <Radio
        label='Show time according to UTC'
        labelPosition='right'
        title='Show UTC time instead of using my current timezone'
        checked={ props.domain.state.utcTimeShown }
        groupName='time'
        onChange={ () => props.domain.showUtcTime(true) }
      />
    </fieldset>
  </Overlay>;
