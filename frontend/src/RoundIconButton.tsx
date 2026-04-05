import { JSX } from "solid-js";
import { css } from "./css-hooks";
import { roundButtonStyle, surfaceOverMap } from "./styles/Styles";

export const ChevronIcon = (props: {
  direction: 'up' | 'down'
}): JSX.Element =>
  <div style={{
    display: 'inline-block',
    width: '10px',
    height: '10px',
    'margin-top': '12px',
    'border-top': '2px solid black',
    'border-right': '2px solid black',
    transform: props.direction === 'up' ?
      'translateY(-50%) rotate(-45deg)' :
      'translateY(-50%) rotate(135deg)'
  }} />;

export const RoundIconButton = (props: {
  title: string
  onClick: () => void
  children: JSX.Element
  style?: JSX.CSSProperties
}): JSX.Element =>
  <div
    style={css({
      ...surfaceOverMap,
      ...roundButtonStyle,
      border: '1px solid lightgray',
      'box-sizing': 'border-box',
      'background-color': 'white',
      on: $ => [$('hover', { 'background-color': 'lightgray' })],
      ...(props.style || {})
    })}
    onClick={ props.onClick }
    title={ props.title }
  >
    { props.children }
  </div>;
