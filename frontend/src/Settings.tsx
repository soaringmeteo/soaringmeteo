import { JSX } from "solid-js";
import { Domain } from "./State";
import { Overlay } from "./map/Overlay";
import {Checkbox, Radio} from "./styles/Forms";

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
      <p>By default, the wind speed is indicated by a numerical value next to each wind arrow. If you hide the numerical values, in the meteograms the wind speed will be indicated by wind barbs (with a precision of 2.5 km/h). See the help on the meteograms for more information on how to interpret the barbs.</p>
      <Checkbox
        label='Show the numerical values'
        title='Show the wind speed as a numerical value next to the wind arrow'
        checked={ props.domain.state.windNumericValuesShown }
        onChange={ value => props.domain.showWindNumericValues(value) }
        labelPosition='right'
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