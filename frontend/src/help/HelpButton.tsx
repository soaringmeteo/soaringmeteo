import type { Domain } from "../State";
import { createSignal, JSX, lazy } from "solid-js";
import { Overlay } from "../map/Overlay";
import { RoundIconButton, QuestionMarkIcon } from "../RoundIconButton";
import {useI18n} from "../i18n";

const Help = lazy(() => import('./Help').then(module => ({ default: module.Help })));

export const HelpButton = (props: { domain: Domain, overMap: boolean }): JSX.Element => {

    const { m } = useI18n();
    const [isVisible, makeVisible] = createSignal(false);

    const expandButton =
      <RoundIconButton
        onClick={ () => makeVisible(true) }
        title={ m().help() }
        overMap={ props.overMap }
      >
        <QuestionMarkIcon />
      </RoundIconButton>;

    return <>
      { expandButton }
      <Overlay
        isVisible={ isVisible() }
        close={ () => makeVisible(false) }
        maxWidth='80em'
      >
        <span style="text-align: left">
          <Help domain={ props.domain } />
        </span>
      </Overlay>
    </>;
};
