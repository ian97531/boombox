import { Action } from 'redux'

export enum WindowEventsActions {
  REQUEST_SCROLL_POSITION = 'REQUEST_SCROLL_POSITION',
  UPDATE_CURRENT_SCROLL_POSITION = 'UPDATE_CURRENT_SCROLL_POSITION',
  UPDATE_CURRENT_WINDOW_SIZE = 'UPDATE_CURRENT_WINDOW_SIZE',
  UPDATE_SCROLL_COMPLETE = 'UPDATE_SCROLL_COMPLETE',
}

export interface IRequestScrollPositionAction extends Action {
  requestedScrollDuration: number
  requestedScrollPosition: number
  type: WindowEventsActions.REQUEST_SCROLL_POSITION
}

export interface IUpdateCurrentScrollPositionAction extends Action {
  scrollPosition: number
  type: WindowEventsActions.UPDATE_CURRENT_SCROLL_POSITION
  userScrolled: boolean
}

export interface IUpdateCurrentWindowSizeAction extends Action {
  width: number
  height: number
  type: WindowEventsActions.UPDATE_CURRENT_WINDOW_SIZE
}

export interface IUpdateScrollCompleteAction extends Action {
  requestedScrollCancelled: boolean
  type: WindowEventsActions.UPDATE_SCROLL_COMPLETE
  userScrolled: boolean
}

export const requestScrollPosition = (
  requestedScrollPosition: number,
  requestedScrollDuration: number
): IRequestScrollPositionAction => ({
  requestedScrollDuration,
  requestedScrollPosition,
  type: WindowEventsActions.REQUEST_SCROLL_POSITION,
})

export const updateCurrentScrollPosition = (
  scrollPosition: number,
  userScrolled: boolean = false
): IUpdateCurrentScrollPositionAction => ({
  scrollPosition,
  type: WindowEventsActions.UPDATE_CURRENT_SCROLL_POSITION,
  userScrolled,
})

export const updateCurrentWindowSize = (
  width: number,
  height: number
): IUpdateCurrentWindowSizeAction => ({
  height,
  type: WindowEventsActions.UPDATE_CURRENT_WINDOW_SIZE,
  width,
})

export const updateScrollComplete = (
  requestedScrollCancelled: boolean = false,
  userScrolled: boolean = false
): IUpdateScrollCompleteAction => ({
  requestedScrollCancelled,
  type: WindowEventsActions.UPDATE_SCROLL_COMPLETE,
  userScrolled,
})
