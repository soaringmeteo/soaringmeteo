import type {Domain} from "./State";
import {createSignal, JSX, Match, Show, Switch} from "solid-js";
import {useI18n} from "./i18n";
import {buttonBorderSizePx, buttonStyle, surfaceOverMap} from "./styles/Styles";
import {css} from "./css-hooks";
import {showDate} from "./shared";
import {gfsName, wrfName} from "./data/Model";

export const DaySelector = (props: {
  domain: Domain
}): JSX.Element => {
  const { m } = useI18n();
  const state = props.domain.state;

  const inlineButtonStyle = { ...buttonStyle, padding: '0.5em 0.5em', display: 'inline-block' };
  const daySelectorButttonStyle = (isSelected: boolean): JSX.CSSProperties => css({
    ...buttonStyle,
    'padding': '0.4em 0.4em',
    'margin-bottom': `-${buttonBorderSizePx}px`,
    'background-color': isSelected ? 'lightGray' : 'unset',
    hover: { 'background-color': 'lightGray' },
  });

  const [isDaySelectorVisible, makeDaySelectorVisible] = createSignal(false);

  const GfsDayOptions = (): JSX.Element => {
    const run = props.domain.state.forecastMetadata;
    const selectedTimeStep = props.domain.state.hourOffset;
    const lastTimeStep = new Date(run.firstTimeStep);
    lastTimeStep.setUTCHours(lastTimeStep.getUTCHours() + run.latest);
    const numberOfPreviousDays =
      Math.floor((run.firstTimeStep.getHours() + selectedTimeStep) / 24);
    const timeSteps: Array<number> =
      Array.from({ length: numberOfPreviousDays })
        .map((_, i) => selectedTimeStep - (numberOfPreviousDays - i) * 24);
    timeSteps.push(selectedTimeStep);
    const numberOfNextDays = (run.latest - selectedTimeStep + (23 - run.dateAtHourOffset(run.latest).getHours())) / 24;
    const nextTimeSteps =
      Array.from({ length: numberOfNextDays })
        .map((_, i) => selectedTimeStep + (i + 1) * 24);
    timeSteps.push(...nextTimeSteps);
    return timeSteps.map(timeStep => {
      const date = props.domain.state.forecastMetadata.dateAtHourOffset(timeStep);
      const isSelected = timeStep === selectedTimeStep;
      return <div
        style={ daySelectorButttonStyle(isSelected) }
        onClick={ () => { props.domain.setHourOffset(timeStep); makeDaySelectorVisible(false); } }
      >
        { showDate(date, { showHour: false, showWeekDay: true, timeZone: props.domain.timeZone() }) }
      </div>
    })
  };

  const WrfDayOptions = (): JSX.Element =>
    props.domain.wrfRuns.map(run => {
      const isSelected =
        run.firstTimeStep.getTime() === props.domain.state.forecastMetadata.firstTimeStep.getTime();
      return <div
        style={ daySelectorButttonStyle(isSelected) }
        onClick={ () => { props.domain.setForecastMetadata(run, props.domain.state.hourOffset); makeDaySelectorVisible(false); } }
      >
        { showDate(run.firstTimeStep, { showHour: false, showWeekDay: true, timeZone: props.domain.timeZone() }) }
      </div>
    });


  const currentDayEl =
    <div style={{ position: 'relative' }}>
      <Show when={ isDaySelectorVisible() }>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: 'translateY(-100%)',
            width: '100%',
            'background-color': 'white'
          }}
        >
          <Switch>
            <Match when={ props.domain.state.model.name === gfsName }>
              <GfsDayOptions />
            </Match>
            <Match when={ props.domain.state.model.name === wrfName }>
              <WrfDayOptions />
            </Match>
          </Switch>
        </div>
      </Show>
      <div
        style={ daySelectorButttonStyle(false) }
        onClick={ () => makeDaySelectorVisible(!isDaySelectorVisible()) }
      >
        {
          showDate(
            state.forecastMetadata.dateAtHourOffset(state.hourOffset),
            { showWeekDay: true, timeZone: props.domain.timeZone() }
          )
        }
      </div>
    </div>;

  const previousDayBtn =
    <div
      title={ m().period24HoursBefore() }
      style={{ ...inlineButtonStyle }}
      onClick={ () => props.domain.previousDay() }
    >
      -24
    </div>;

  // FIXME jump to previous day afternoon if we are on the morning period
  const previousPeriodBtn =
    <div
      title={ m().periodPrevious() }
      style={{ ...inlineButtonStyle, 'margin-left': `-${buttonBorderSizePx}px` }}
      onClick={ () => props.domain.previousHourOffset() }
    >
      -{ props.domain.state.model.timeStep }
    </div>;

  // FIXME jump to next day morning if we are on the afternoon period
  const nextPeriodBtn =
    <div
      title={ m().periodNext() }
      style={{ ...inlineButtonStyle, 'margin-left': `-${buttonBorderSizePx}px` }}
      onClick={ () => props.domain.nextHourOffset() }
    >
      +{ props.domain.state.model.timeStep }
    </div>;

  const nextDayBtn =
    <div
      title={ m().period24HoursAfter() }
      style={{ ...inlineButtonStyle, 'margin-left': `-${buttonBorderSizePx}px` }}
      onClick={ () => props.domain.nextDay() }
    >
      +24
    </div>;

  return <div
    style={{
      ...surfaceOverMap,
      'background-color': 'white',
      'border-radius': '3px 3px 0 0',
      'text-align': 'center',
      'user-select': 'none',
      cursor: 'default',
      padding: '0',
    }}
  >
    {currentDayEl}
    <div>
      {previousDayBtn}
      {previousPeriodBtn}
      {nextPeriodBtn}
      {nextDayBtn}
    </div>
  </div>;
};
