import { PLAYER_UPDATE } from 'store/actions/player';
import { createBasicReducer } from 'utilities/ReducerUtils';

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

const playerReducer = createBasicReducer<IPlayerStore>(DEFAULT_STATE, {
  [PLAYER_UPDATE]: (state, action) => ({
    ...state,
    ...action.changes,
  }),
});

export default playerReducer;
