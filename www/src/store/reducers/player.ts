import update from 'immutability-helper';
import { AnyAction } from 'redux';
import * as PlayerActions from 'store/actions/player';

export enum PlayerStatus {
  Idle = 'IDLE',
  Playing = 'PLAYING',
  Loading = 'LOADING',
  Error = 'ERROR',
}

export interface IPlayerStore {
  currentSrc: string | null;
  currentTime: number;
  duration: number;
  status: PlayerStatus;
}

const DEFAULT_STATE: IPlayerStore = {
  currentSrc: null,
  currentTime: 0,
  duration: 0,
  status: PlayerStatus.Idle,
};

const playerReducer = (
  state = DEFAULT_STATE,
  action: AnyAction,
): IPlayerStore => {
  switch (action.type) {
    case PlayerActions.PLAYER_UPDATE:
      // Map the changes into an immutable update object
      const updates = Object.keys(action.changes).reduce((acc, key) => {
        acc[key] = { $set: action.changes[key] };
        return acc;
      }, {});
      return update(state, updates);
    default:
      return state;
  }
};

export default playerReducer;
