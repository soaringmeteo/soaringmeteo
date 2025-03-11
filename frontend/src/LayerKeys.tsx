import {Domain} from "./State";
import {JSX, Show} from "solid-js";
import {mapIndex} from "./styles/Styles";

export const LayerKeys = (props: {
  domain: Domain
}): JSX.Element => {
  const primaryLayerComponents = () => props.domain.primaryLayerReactiveComponents();

  return <Show when={
    props.domain.state.primaryLayerEnabled && props.domain.state.mapKeyShown
  }>
    <div style={{
      position: 'absolute',
      bottom: '.5rem',
      right: '.5rem',
      'background-color': '#d6d6c5', // “neutral” color in the basemap
      'font-size': '11px',
      'padding': '4px',
      'text-align': 'center',
      'z-index': mapIndex,
    }}>
      {primaryLayerComponents().mapKey}
    </div>
  </Show>
};
