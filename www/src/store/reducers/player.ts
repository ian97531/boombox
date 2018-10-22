import { PLAYER_UPDATE } from 'store/actions/player'
import { AudioControllerStatus } from 'utilities/AudioController'
import { createBasicReducer } from 'utilities/ReducerUtils'

export interface IPlayerStore {
  currentSrc: string | null
  currentTime: number
  duration: number
  status: AudioControllerStatus
}

const DEFAULT_STATE: IPlayerStore = {
  currentSrc: null,
  currentTime: 0,
  duration: 0,
  status: AudioControllerStatus.Idle,
}

const playerReducer = createBasicReducer<IPlayerStore>(DEFAULT_STATE, {
  [PLAYER_UPDATE]: (state, action) => ({
    ...state,
    ...action.changes,
  }),
})

export default playerReducer
