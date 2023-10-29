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

export const Checkbox = (props: {
  label: string
  labelPosition?: 'left' | 'right'
  title: string
  checked: boolean
  onChange: (checked: boolean) => void
}): JSX.Element =>
  <Labelled label={ props.label } title={ props.title } labelPosition={ props.labelPosition }>
    <input
      type="checkbox"
      checked={ props.checked }
      onChange={ (event) => props.onChange(event.currentTarget.checked) }
    />
  </Labelled>;

export const Select = <A,>(props: {
  title: string
  options: Array<[string, A]>
  selectedOption: A
  onChange: (value: A) => void
  key: (value: A) => string
}): JSX.Element =>
  <div style="text-align: right">
    <select
      title={props.title}
      onChange={
        event => {
          const option =
            props.options.find(item => item[0] === event.currentTarget.value);
          if (option !== undefined) {
            props.onChange(option[1]);
          }
        }
      }
    >
      {
        props.options.map(([label, value]) =>
          <option
            selected={ props.key(props.selectedOption) === props.key(value) }
          >
            {label}
          </option>
        )
      }
    </select>
  </div>;

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
