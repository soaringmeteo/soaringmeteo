import { JSX, Show } from 'solid-js'
import { surfaceOverMap } from '../styles/Styles'

/** Reusable component for creating overlays */
export const OverlayContainer = (props: {
  handleClick: () => void
  children: JSX.Element
}): JSX.Element => {
  return <div
    style={{
      position: 'fixed',
      inset: '0',
      'background-color': 'rgb(0, 0, 0, 0.25)',
      cursor: 'pointer',
      'backdrop-filter': 'blur(2px)',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'z-index': 1000
    }}
    onClick={ () => props.handleClick() }
  >
    { props.children }
  </div>
};

/**
 * An overlay on the map, with a blur background.
 */
export const Overlay = (props: {
  isVisible: boolean
  close: () => void
  children: JSX.Element
  maxWidth: string
}): JSX.Element => {
  return <Show when={props.isVisible}>
    <OverlayContainer handleClick={props.close}>
      <div
        style={{
          ...surfaceOverMap,
          'max-width': props.maxWidth,
          display: 'inline-block',
          'border-radius': '5px',
          'background-color': 'white',
          padding: '0.5em',
          'font-size': '1rem',
          cursor: 'auto',
          'overflow': 'scroll',
          'max-height': '85%'
        }}
        onClick={ e => e.stopPropagation() }
      >
        { props.children }
      </div>
    </OverlayContainer>
  </Show>
};
