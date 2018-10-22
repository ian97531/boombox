import { ActionCreator, AnyAction } from 'redux'
import AudioController from 'utilities/AudioController'

export const PLAYER_UPDATE = 'PLAYER_UPDATE'

export const playerUpdate: ActionCreator<AnyAction> = (changes: object) => ({
  changes,
  type: PLAYER_UPDATE,
})

export const playerCurrentTimeSeek: ActionCreator<any> = (currentTime: number) => () =>
  AudioController.seek(Number(currentTime.toFixed(3)))

export const playerPlay: ActionCreator<any> = () => () => AudioController.play()

export const playerPause: ActionCreator<any> = () => () => AudioController.pause()
