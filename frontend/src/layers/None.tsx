import { JSX } from 'solid-js';
import { Layer, ReactiveComponents } from './Layer';

// TODO Remove this as a Layer, model it a boolean option in the State
export const noLayer : Layer = {
  key: 'none',
  name: 'None',
  title: 'Map only',
  dataPath: '',
  reactiveComponents(): ReactiveComponents {
    return {
      summarizer: () => ({
        async summary(): Promise<Array<[string, JSX.Element]> | undefined> {
          return []
        }
      }),
      mapKey: <div />,
      help: <p>This layer just shows the map.</p>
    }
  }
};
