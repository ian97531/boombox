import {
  IScrollToPositionAction,
  ISetScrollPositionAction,
  ISetWindowSizeAction,
  WindowEventsActions,
} from 'store/actions/windowEvents'
import { createBasicReducer } from 'utilities/ReducerUtils'

export interface IWindowEventsStore {
  currentWidth: number
  currentHeight: number
  currentScrollPosition: number
  requestedScrollPosition: number | null
  requestedScrollDuration: number | null
  userScrolled: boolean
}

const DEFAULT_STATE: IWindowEventsStore = {
  currentHeight: window.innerHeight,
  currentScrollPosition: window.scrollY,
  currentWidth: window.innerWidth,
  requestedScrollDuration: null,
  requestedScrollPosition: null,
  userScrolled: false,
}

const windowEventsReducer = createBasicReducer(DEFAULT_STATE, {
  [WindowEventsActions.SET_WINDOW_SIZE]: (state, action: ISetWindowSizeAction) => ({
    ...state,
    currentHeight: action.currentHeight,
    currentWidth: action.currentWidth,
  }),
  [WindowEventsActions.SET_SCROLL_POSITION]: (state, action: ISetScrollPositionAction) => ({
    ...state,
    currentScrollPosition: action.currentScrollPosition,
    requestedScrollDuration: null,
    requestedScrollPosition: null,
    userScrolled: action.userScrolled,
  }),
  [WindowEventsActions.SCROLL_TO_POSITION]: (state, action: IScrollToPositionAction) => ({
    ...state,
    requestedScrollDuration: action.requestedScrollDuration,
    requestedScrollPosition: action.requestedScrollPosition,
  }),
})

export default windowEventsReducer
