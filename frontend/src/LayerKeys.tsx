import {Domain} from "./State";
import {JSX, Show} from "solid-js";

export const LayerKeys = (props: {
  domain: Domain
}): JSX.Element => {
  const primaryLayerComponents = () => props.domain.primaryLayerReactiveComponents();

  return <Show when={ props.domain.state.primaryLayerEnabled }>
    <div style={{
      position: 'absolute',
      bottom: '3rem',
      right: '.5rem',
      'background-color': 'rgba(255, 255,  255, 0.5',
      'font-size': '11px',
      'padding': '5px',
      'text-align': 'center'
    }}>
      {primaryLayerComponents().mapKey}
    </div>
  </Show>
};
