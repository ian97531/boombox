import {
  ISetScrollAnimationCancelled,
  ISetScrollAnimationComplete,
  ISetScrollAnimationStart,
  ISetScrollPositionAction,
  WindowEventsActions,
} from 'store/actions/windowEvents'
import { createBasicReducer } from 'utilities/ReducerUtils'

export interface IWindowEventsStore {
  currentScrollPosition: number
  scrollAnimationCancelled: boolean
  scrollAnimationInProgress: boolean
  scrollAnimationRequestedPosition: number | null
}

const DEFAULT_STATE: IWindowEventsStore = {
  currentScrollPosition: 0,
  scrollAnimationCancelled: false,
  scrollAnimationInProgress: false,
  scrollAnimationRequestedPosition: null,
}

const windowEventsReducer = createBasicReducer(DEFAULT_STATE, {
  [WindowEventsActions.SET_SCROLL_POSITION]: (state, action: ISetScrollPositionAction) => ({
    ...state,
    currentScrollPosition: action.currentScrollPosition,
  }),
  [WindowEventsActions.SET_SCROLL_ANIMATION_START]: (state, action: ISetScrollAnimationStart) => ({
    ...state,
    scrollAnimationCancelled: false,
    scrollAnimationInProgress: true,
    setScrollAnimationRequestedPosition: action.requestedPosition,
  }),
  [WindowEventsActions.SET_SCROLL_ANIMATION_STOP]: (
    state,
    action: ISetScrollAnimationComplete
  ) => ({
    ...state,
    scrollAnimationCancelled: false,
    scrollAnimationInProgress: false,
    setScrollAnimationRequestedPosition: null,
  }),
  [WindowEventsActions.SET_SCROLL_ANIMATION_CANCELLED]: (
    state,
    action: ISetScrollAnimationCancelled
  ) => ({
    ...state,
    scrollAnimationCancelled: true,
    scrollAnimationInProgress: false,
    setScrollAnimationRequestedPosition: null,
  }),
})

export default windowEventsReducer
