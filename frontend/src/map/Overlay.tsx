import { JSX, Show } from 'solid-js'
import { surfaceOverMap } from '../styles/Styles'

/**
 * An overlay on the map, with a blur background.
 */
export const Overlay = (props: {
  isVisible: boolean,
  close: () => void,
  children: JSX.Element,
  maxWidth: string
}): JSX.Element => {
  const element =
    <div
      style={{
        position: 'fixed',
        inset: '0',
        'background-color': 'rgb(0, 0, 0, 0.3)',
        cursor: 'pointer',
        'backdrop-filter': 'blur(5px)',
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'center',
        'z-index': 1000
      }}
      onClick={ () => props.close() }
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
          'max-height': '90%'
        }}
        onClick={ e => e.stopPropagation() }
      >
        { props.children }
      </div>
    </div> as HTMLElement;

  return <Show when={ props.isVisible }>
    { element }
  </Show>;
};
