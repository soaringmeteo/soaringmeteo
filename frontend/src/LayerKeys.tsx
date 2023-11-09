import {Domain} from "./State";
import {JSX} from "solid-js";

export const LayerKeys = (props: {
  domain: Domain
}): JSX.Element => {
  const primaryLayerComponents = () => props.domain.primaryLayerReactiveComponents();

  return <div style={{
    position: 'absolute',
    bottom: '45px',
    left: '5px',
    'background-color': 'rgba(255, 255,  255, 0.5',
    'font-size': '11px',
    'padding': '5px',
    'text-align': 'center'
  }}>
    {primaryLayerComponents().mapKey}
  </div>
};
