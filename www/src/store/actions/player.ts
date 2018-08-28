import { ActionCreator, AnyAction } from 'redux'
import AudioController from 'utilities/AudioController'

export const PLAYER_CURRENT_SCRUB_TIME_CLEAR = 'PLAYER_CURRENT_SCRUB_TIME_CLEAR'
export const PLAYER_CURRENT_SCRUB_TIME_SET = 'PLAYER_CURRENT_SCRUB_TIME_SET'
export const PLAYER_UPDATE = 'PLAYER_UPDATE'

export const playerCurrentScrubTimeClear: ActionCreator<AnyAction> = () => ({
  type: PLAYER_CURRENT_SCRUB_TIME_CLEAR,
})

export const playerCurrentScrubTimeSet: ActionCreator<AnyAction> = (currentScrubTime: number) => ({
  currentScrubTime,
  type: PLAYER_CURRENT_SCRUB_TIME_SET,
})

export const playerUpdate: ActionCreator<AnyAction> = (changes: object) => ({
  changes,
  type: PLAYER_UPDATE,
})

export const playerCurrentTimeSeek: ActionCreator<any> = (currentTime: number) => () =>
  AudioController.seek(currentTime)

export const playerPlay: ActionCreator<any> = () => () => AudioController.play()

export const playerPause: ActionCreator<any> = () => () => AudioController.pause()
