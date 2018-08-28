import {
  PLAYER_CURRENT_SCRUB_TIME_CLEAR,
  PLAYER_CURRENT_SCRUB_TIME_SET,
  PLAYER_UPDATE,
} from 'store/actions/player'
import { AudioControllerStatus } from 'utilities/AudioController'
import { createBasicReducer } from 'utilities/ReducerUtils'

export interface IPlayerStore {
  currentScrubTime: number | null
  currentSrc: string | null
  currentTime: number
  duration: number
  status: AudioControllerStatus
}

const DEFAULT_STATE: IPlayerStore = {
  currentScrubTime: null,
  currentSrc: null,
  currentTime: 0,
  duration: 0,
  status: AudioControllerStatus.Idle,
}

const playerReducer = createBasicReducer<IPlayerStore>(DEFAULT_STATE, {
  [PLAYER_CURRENT_SCRUB_TIME_CLEAR]: (state, action) => ({
    ...state,
    currentScrubTime: null,
  }),
  [PLAYER_CURRENT_SCRUB_TIME_SET]: (state, action) => ({
    ...state,
    currentScrubTime: action.currentScrubTime,
  }),
  [PLAYER_UPDATE]: (state, action) => ({
    ...state,
    ...action.changes,
  }),
})

export default playerReducer
