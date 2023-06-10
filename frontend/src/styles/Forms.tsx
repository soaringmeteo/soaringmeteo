import { JSX } from 'solid-js'

export const Radio = (props: {
  label: string
  labelPosition?: 'left' | 'right'
  title: string
  checked: boolean
  groupName: string
  onChange: () => void
}): JSX.Element =>
  <Labelled
    label={ props.label }
    title={ props.title }
    labelPosition={ props.labelPosition }
  >
    <input
      name={ props.groupName }
      type='radio'
      checked={ props.checked }
      onChange={ () => props.onChange() }
    />
  </Labelled>;

export const Labelled = (props: {
  label: string
  title: string
  children: JSX.Element
  labelPosition?: 'left' | 'right'
}): JSX.Element =>
  <div style={{
    'background-color': 'rgba(255, 255, 255, 0.5)',
    'text-align': props.labelPosition === 'right' ? 'left' : 'right'
  }}
  >
    <label
      style={{ cursor: 'pointer', padding: '0.3em' }}
      title={props.title}
    >
      {
        props.labelPosition === 'right' ?
        <>{props.children}{props.label}</> :
        <>{props.label}{props.children}</>
      }
    </label>
  </div>;
