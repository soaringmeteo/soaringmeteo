import { JSX, Show } from 'solid-js'
import { surfaceOverMap } from '../styles/Styles'

/** Reusable component for creating overlays */
export const OverlayContainer = (props: {
  handleClick: () => void
  extraStyle?: JSX.CSSProperties
  children: JSX.Element
}): JSX.Element => {
  return <div
    style={{
      position: 'fixed',
      inset: '0',
      cursor: 'pointer',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'z-index': 1000,
      ...(props.extraStyle ?? {})
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
    <OverlayContainer
      handleClick={props.close}
      extraStyle={{
        'background-color': 'rgb(0, 0, 0, 0.20)',
        'backdrop-filter': 'blur(1px)',
      }}
    >
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
