import * as React from 'react'

export type IUserScrollListener = (position?: number, scrollHeight?: number) => void
export type IResizeListener = (width?: number, height?: number, scrollHeight?: number) => void
export type IScrollCompleteListener = (cancelled?: boolean, userScrolled?: boolean) => void

export type IUpdateUserScrollListener = (listener: IUserScrollListener) => void
export type IUpdateResizeListener = (listener: IResizeListener) => void
export type IRequestScrollPosition = (
  position: number,
  duration: number,
  complete?: IScrollCompleteListener
) => void

export interface IWindowContext {
  addUserScrollListener: IUpdateUserScrollListener
  addResizeListener: IUpdateResizeListener
  removeUserScrollListener: IUpdateUserScrollListener
  removeResizeListener: IUpdateResizeListener
  requestScrollPosition: IRequestScrollPosition
}

let scrollUpdateRequested = false
let windowSizeUpdateRequested = false

let scrollPosition: number = window.scrollY
let scrollAnimationDistance: number = 0
let scrollAnimationDuration: number = 0
let scrollAnimationInterrupted: boolean = false
let scrollAnimationStartPosition: number = 0
let scrollAnimationEndPosition: number | null = null
let scrollAnimationStartTime: number | null = null
let scrollAnimationInProgress: boolean = false
let scrollAnimationRaf: number | null = null
let scrollCompleteListener: IScrollCompleteListener | null

let resizeInProgress: boolean = false
let resizeTimeout: NodeJS.Timeout | undefined

const scrollListeners: IUserScrollListener[] = []
const resizeListeners: IResizeListener[] = []

const getScrollHeight = (): number => {
  const body = document.body
  const clientHeight = (document.documentElement && document.documentElement.clientHeight) || 0
  const scrollHeight = (document.documentElement && document.documentElement.scrollHeight) || 0
  const offsetHeight = (document.documentElement && document.documentElement.offsetHeight) || 0
  return Math.max(body.scrollHeight, body.offsetHeight, clientHeight, scrollHeight, offsetHeight)
}

const addUserScrollListener = (listener: IUserScrollListener) => {
  scrollListeners.push(listener)
}

const addResizeListener = (listener: IResizeListener) => {
  resizeListeners.push(listener)
}

const removeUserScrollListener = (listener: IUserScrollListener) => {
  const index = scrollListeners.indexOf(listener)
  if (index !== -1) {
    scrollListeners.splice(index, 1)
  }
}

const removeResizeListener = (listener: IResizeListener) => {
  const index = resizeListeners.indexOf(listener)
  if (index !== -1) {
    resizeListeners.splice(index, 1)
  }
}

const scrollFinished = (cancelled: boolean = false, userScrolled: boolean = false) => {
  if (scrollCompleteListener) {
    scrollCompleteListener(cancelled, userScrolled)
    scrollCompleteListener = null
  }
}

// helps us cancel scroll animations when the user scrolls.
const mouseWheelEvent = (event: WheelEvent) => {
  if (event.wheelDeltaY && scrollAnimationInProgress) {
    scrollAnimationInterrupted = true
  }
}

const updateScrollPosition = (event?: Event) => {
  if (!scrollUpdateRequested) {
    window.requestAnimationFrame(() => {
      const userScrolled = !scrollAnimationInProgress && !resizeInProgress
      const scrollHeight = getScrollHeight()
      if (userScrolled) {
        for (const listener of scrollListeners) {
          listener(window.scrollY, scrollHeight)
        }
      }
      if (scrollAnimationInProgress && window.scrollY === scrollAnimationEndPosition) {
        console.log('scroll animation complete')
        scrollAnimationInProgress = false
        scrollAnimationEndPosition = null
      }
      scrollUpdateRequested = false
    })
    scrollUpdateRequested = true
  }
}

const updateWindowSize = (event?: Event) => {
  resizeInProgress = true
  scrollAnimationInterrupted = true

  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
    resizeTimeout = undefined
  }

  if (!windowSizeUpdateRequested) {
    window.requestAnimationFrame(() => {
      const scrollHeight = getScrollHeight()
      for (const listener of resizeListeners) {
        listener(window.innerWidth, window.innerHeight, scrollHeight)
        setTimeout(() => {
          resizeInProgress = false
          resizeTimeout = undefined
        }, 500)
      }
      windowSizeUpdateRequested = false
    })
    windowSizeUpdateRequested = true
  }
}

const requestScrollPosition = (
  position: number,
  duration: number,
  complete: IScrollCompleteListener
) => {
  if (
    position === scrollAnimationEndPosition ||
    (!scrollAnimationInProgress && position === window.scrollY)
  ) {
    return
  } else {
    // If another scroll animation is already in progress, cancel it before starting one.
    if (scrollAnimationInProgress) {
      if (scrollAnimationRaf) {
        cancelAnimationFrame(scrollAnimationRaf)
      }
    }
    scrollCompleteListener = complete
    scrollAnimationInProgress = true
    scrollAnimationEndPosition = position
    if (duration) {
      scrollAnimationDuration = duration
      scrollAnimationInterrupted = false
      scrollAnimationStartPosition = window.scrollY
      scrollAnimationDistance = position - scrollAnimationStartPosition
      scrollAnimationStartTime = null
      scrollAnimationRaf = window.requestAnimationFrame(stepScrollPosition)
    } else {
      window.scrollTo({ top: position })
      scrollPosition = window.scrollY
      scrollFinished()
    }
  }
}

const cubicEaseInOut = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
}

const stepScrollPosition = (timestamp: number) => {
  const scrollAnimationCancelled = scrollAnimationInterrupted || window.scrollY !== scrollPosition
  let complete = false
  if (!scrollAnimationStartTime) {
    scrollAnimationStartTime = timestamp
  }

  if (!scrollAnimationCancelled) {
    const timeSpent = timestamp - scrollAnimationStartTime
    const percentComplete = timeSpent / scrollAnimationDuration
    const nextScrollPosition =
      scrollAnimationStartPosition + scrollAnimationDistance * cubicEaseInOut(percentComplete)
    window.scrollTo({ top: nextScrollPosition })
    scrollPosition = window.scrollY

    if (timeSpent < scrollAnimationDuration) {
      scrollAnimationRaf = window.requestAnimationFrame(stepScrollPosition)
    } else {
      complete = true
    }
  } else {
    complete = true
  }

  if (complete) {
    const userScrolled = scrollAnimationCancelled && !resizeInProgress
    scrollFinished(scrollAnimationCancelled, userScrolled)
  }
}

const context: IWindowContext = {
  addResizeListener,
  addUserScrollListener,
  removeResizeListener,
  removeUserScrollListener,
  requestScrollPosition,
}

const WindowContext = React.createContext<IWindowContext>(context)

export const WindowEventsConsumer = WindowContext.Consumer
export class WindowEvents extends React.Component {
  public componentDidMount() {
    window.addEventListener('wheel', mouseWheelEvent, { passive: true })
    window.addEventListener('scroll', updateScrollPosition, { passive: true })
    window.addEventListener('resize', updateWindowSize, { passive: true })
  }

  public componentWillUnmount() {
    window.removeEventListener('wheel', mouseWheelEvent)
    window.removeEventListener('scroll', updateScrollPosition)
    window.removeEventListener('resize', updateWindowSize)
  }

  public render() {
    return <WindowContext.Provider value={context}>{this.props.children}</WindowContext.Provider>
  }
}
