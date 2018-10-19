import { Action, ActionCreator, AnyAction, Dispatch } from 'redux'

let currentAnimation: number | null = null

export enum WindowEventsActions {
  SET_SCROLL_POSITION = 'SET_SCROLL_POSITION',
  SET_SCROLL_ANIMATION_CANCELLED = 'SET_SCROLL_ANIMATION_CANCELLED',
  SET_SCROLL_ANIMATION_START = 'SET_SCROLL_ANIMATION_START',
  SET_SCROLL_ANIMATION_STOP = 'SET_SCROLL_ANIMATION_STOP',
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
    let startTime: number | null = null
    const startPosition = window.scrollY
    const scrollDistance = position - startPosition
    let currentScrollPosition: number | null = null
    const updateScrollPosition = (timestamp: number) => {
      if (!startTime) {
        startTime = timestamp
      }

      if (window.scrollY === currentScrollPosition || !allowCancel) {
        const progress = timestamp - startTime
        const percentComplete = progress / animateMilliseconds
        const nextPosition = startPosition + scrollDistance * cubicEaseInOut(percentComplete)
        window.scrollTo({ top: nextPosition })
        currentScrollPosition = nextPosition

        if (progress < animateMilliseconds) {
          currentAnimation = window.requestAnimationFrame(updateScrollPosition)
        } else {
          dispatch(setScrollAnimationComplete())
        }
      } else {
        dispatch(setScrollAnimationCancelled())
      }
    }
    currentAnimation = window.requestAnimationFrame(updateScrollPosition)
    dispatch(setScrollAnimationStart(position))
  }
}

export const cancelScrollAnimation: ActionCreator<any> = () => {
  return (dispatch: Dispatch<AnyAction>): void => {
    if (currentAnimation) {
      window.cancelAnimationFrame(currentAnimation)
      currentAnimation = null
      dispatch(setScrollAnimationComplete())
    }
  }
}
