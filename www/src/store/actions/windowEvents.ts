import { Action } from 'redux'

export enum WindowEventsActions {
  SET_WINDOW_SIZE = 'SET_WINDOW_SIZE',
  SET_SCROLL_POSITION = 'SET_SCROLL_POSITION',
  SCROLL_TO_POSITION = 'SCROLL_TO_POSITION',
}

export interface ISetWindowSizeAction extends Action {
  currentWidth: number
  currentHeight: number
  type: WindowEventsActions.SET_WINDOW_SIZE
}

export interface ISetScrollPositionAction extends Action {
  currentScrollPosition: number
  type: WindowEventsActions.SET_SCROLL_POSITION
  userScrolled: boolean
}

export interface IScrollToPositionAction extends Action {
  requestedScrollPosition: number
  requestedScrollDuration: number
  type: WindowEventsActions.SCROLL_TO_POSITION
}

export const setCurrentWindowSize = (
  currentWidth: number,
  currentHeight: number
): ISetWindowSizeAction => ({
  currentHeight,
  currentWidth,
  type: WindowEventsActions.SET_WINDOW_SIZE,
})

export const setCurrentScrollPosition = (
  currentScrollPosition: number,
  userScrolled: boolean = false
): ISetScrollPositionAction => ({
  currentScrollPosition,
  type: WindowEventsActions.SET_SCROLL_POSITION,
  userScrolled,
})

export const scrollToPosition = (
  requestedScrollPosition: number,
  requestedScrollDuration: number = 0
): IScrollToPositionAction => ({
  requestedScrollDuration,
  requestedScrollPosition,
  type: WindowEventsActions.SCROLL_TO_POSITION,
})
