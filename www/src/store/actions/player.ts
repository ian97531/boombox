import { ActionCreator, AnyAction } from 'redux';
import AudioController from 'utilities/AudioController';

export const PLAYER_CURRENT_TIME_SEEK = 'PLAYER_CURRENT_TIME_SEEK';
export const PLAYER_UPDATE = 'PLAYER_UPDATE';

export const playerUpdate: ActionCreator<AnyAction> = (changes: object) => ({
  changes,
  type: PLAYER_UPDATE,
});

// TODO(ndrwhr): Figure out redux thunk typing.
export const playerCurrentTimeSeek: ActionCreator<any> = (
  currentTime: number,
) => () => AudioController.seek(currentTime);
