import {
  IRequestScrollPositionAction,
  IUpdateCurrentScrollPositionAction,
  IUpdateCurrentWindowSizeAction,
  IUpdateScrollCompleteAction,
  WindowEventsActions,
} from 'store/actions/windowEvents'
import { createBasicReducer } from 'utilities/ReducerUtils'

export interface IWindowEventsStore {
  height: number
  requestedScrollCancelled: boolean
  requestedScrollDuration: number | null
  requestedScrollPosition: number | null
  scrollPosition: number
  userScrolled: boolean
  width: number
}

const DEFAULT_STATE: IWindowEventsStore = {
  height: 0,
  requestedScrollCancelled: false,
  requestedScrollDuration: null,
  requestedScrollPosition: null,
  scrollPosition: 0,
  userScrolled: false,
  width: 0,
}

const windowEventsReducer = createBasicReducer(DEFAULT_STATE, {
  [WindowEventsActions.REQUEST_SCROLL_POSITION]: (state, action: IRequestScrollPositionAction) => ({
    ...state,
    requestedScrollCancelled: false,
    requestedScrollDuration: action.requestedScrollDuration,
    requestedScrollPosition: action.requestedScrollPosition,
    userScrolled: false,
  }),
  [WindowEventsActions.UPDATE_CURRENT_SCROLL_POSITION]: (
    state,
    action: IUpdateCurrentScrollPositionAction
  ) => ({
    ...state,
    scrollPosition: action.scrollPosition,
    userScrolled: action.userScrolled,
  }),
  [WindowEventsActions.UPDATE_CURRENT_WINDOW_SIZE]: (
    state,
    action: IUpdateCurrentWindowSizeAction
  ) => ({
    ...state,
    height: action.height,
    width: action.width,
  }),
  [WindowEventsActions.UPDATE_SCROLL_COMPLETE]: (state, action: IUpdateScrollCompleteAction) => ({
    ...state,
    requestedScrollCancelled: action.requestedScrollCancelled,
    requestedScrollDuration: null,
    requestedScrollPosition: null,
    userScrolled: action.userScrolled,
  }),
})

export default windowEventsReducer
