import { JSX } from "solid-js";
import { css } from "./css-hooks";
import { roundButtonStyle, surfaceOverMap } from "./styles/Styles";

export const ChevronIcon = (props: {
  direction: 'up' | 'down'
}): JSX.Element =>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    { props.direction === 'down'
      ? <polyline points="6,9 12,15 18,9" />
      : <polyline points="6,15 12,9 18,15" />
    }
  </svg>;

export const CloseIcon = (): JSX.Element =>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
  >
    <line x1="7" y1="7" x2="17" y2="17" />
    <line x1="17" y1="7" x2="7" y2="17" />
  </svg>;

export const QuestionMarkIcon = (): JSX.Element =>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M 8,9 C 8,6 10,5 12,5 C 14,5 16,6.5 16,8.5 C 16,11 12,11.5 12,14" />
    <circle cx="12" cy="18" r="1.5" fill="currentColor" stroke="none" />
  </svg>;

export const RoundIconButton = (props: {
  title: string
  onClick: () => void
  children: JSX.Element
  overMap?: boolean
  style?: JSX.CSSProperties
}): JSX.Element =>
  <div
    style={css({
      ...(props.overMap !== false ? surfaceOverMap : {}),
      ...roundButtonStyle,
      border: '1px solid lightgray',
      'box-sizing': 'border-box',
      'background-color': 'white',
      'display': 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      on: $ => [$('hover', { 'background-color': 'lightgray' })],
      ...(props.style || {})
    })}
    onClick={ props.onClick }
    title={ props.title }
  >
    { props.children }
  </div>;
