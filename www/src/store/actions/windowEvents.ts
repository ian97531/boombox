import { Action, ActionCreator, AnyAction, Dispatch } from 'redux'

export enum WindowEventsActions {
  SET_WINDOW_SIZE = 'SET_WINDOW_SIZE',
  SET_SCROLL_POSITION = 'SET_SCROLL_POSITION',
  SET_SCROLL_ANIMATION_CANCELLED = 'SET_SCROLL_ANIMATION_CANCELLED',
  SET_SCROLL_ANIMATION_START = 'SET_SCROLL_ANIMATION_START',
  SET_SCROLL_ANIMATION_STOP = 'SET_SCROLL_ANIMATION_STOP',
}

export interface ISetWindowSizeAction extends Action {
  currentWidth: number
  currentHeight: number
  type: WindowEventsActions.SET_WINDOW_SIZE
}

export interface ISetScrollPositionAction extends Action {
  currentScrollPosition: number
  type: WindowEventsActions.SET_SCROLL_POSITION
}

export interface ISetScrollAnimationCancelled extends Action {
  type: WindowEventsActions.SET_SCROLL_ANIMATION_CANCELLED
}

export interface ISetScrollAnimationStart extends Action {
  requestedPosition: number
  type: WindowEventsActions.SET_SCROLL_ANIMATION_START
}

export interface ISetScrollAnimationComplete extends Action {
  type: WindowEventsActions.SET_SCROLL_ANIMATION_STOP
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
  currentScrollPosition: number
): ISetScrollPositionAction => ({
  currentScrollPosition,
  type: WindowEventsActions.SET_SCROLL_POSITION,
})

export const setScrollAnimationStart = (requestedPosition: number): ISetScrollAnimationStart => ({
  requestedPosition,
  type: WindowEventsActions.SET_SCROLL_ANIMATION_START,
})

export const setScrollAnimationComplete = (): ISetScrollAnimationComplete => ({
  type: WindowEventsActions.SET_SCROLL_ANIMATION_STOP,
})

export const setScrollAnimationCancelled = (): ISetScrollAnimationCancelled => ({
  type: WindowEventsActions.SET_SCROLL_ANIMATION_CANCELLED,
})

export const scrollToPosition: ActionCreator<any> = (
  position: number,
  animateMilliseconds: number = 0,
  allowCancel: boolean = true
) => {
  const cubicEaseInOut = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
  }

  return (dispatch: Dispatch<AnyAction>): void => {
    dispatch(setScrollAnimationStart(position))
    if (animateMilliseconds) {
      let startTime: number | null = null
      const startPosition = window.scrollY
      const scrollDistance = position - startPosition
      let currentScrollPosition = startPosition
      let complete = false

      // Window resizes will cancel scroll animations
      let resizeDetected = false
      const detectResize = (event: Event) => {
        resizeDetected = true
      }
      window.addEventListener('resize', detectResize)
      const updateScrollPosition = (timestamp: number) => {
        if (!startTime) {
          startTime = timestamp
        }

        if (!resizeDetected && (window.scrollY === currentScrollPosition || !allowCancel)) {
          const progress = timestamp - startTime
          const percentComplete = progress / animateMilliseconds
          const nextPosition = startPosition + scrollDistance * cubicEaseInOut(percentComplete)
          window.scrollTo({ top: nextPosition })
          currentScrollPosition = window.scrollY

          if (progress < animateMilliseconds) {
            window.requestAnimationFrame(updateScrollPosition)
          } else {
            complete = true
          }
        } else if (resizeDetected) {
          complete = true
        } else {
          dispatch(setScrollAnimationCancelled())
          window.removeEventListener('resize', detectResize)
        }

        if (complete) {
          window.requestAnimationFrame(() => {
            dispatch(setScrollAnimationComplete())
          })
          window.removeEventListener('resize', detectResize)
        }
      }
      window.requestAnimationFrame(updateScrollPosition)
    } else {
      window.scrollTo({ top: position })
      window.requestAnimationFrame(() => {
        dispatch(setScrollAnimationComplete())
      })
    }
  }
}
