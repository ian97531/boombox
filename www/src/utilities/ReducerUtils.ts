import { AnyAction } from 'redux';

interface IReducerHandlers<S> {
  [key: string]: (state: S, action: AnyAction) => S;
}

/**
 * Creates a simple reducer based on the provided default state and object. Saves us from writing
 * annoying switch statements.
 */
export function createBasicReducer<S>(
  defaultState: S,
  handlers: IReducerHandlers<S>,
) {
  return (state = defaultState, action: AnyAction): S => {
    if (handlers[action.type]) {
      return handlers[action.type](state, action);
    }
    return state;
  };
}
