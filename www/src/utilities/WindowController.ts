import * as BezierEasing from 'bezier-easing'

export type IUserScrollListener = (position: number) => void
export type IScrollListener = (position: number, userScrolled: boolean) => void
export type IResizeListener = (width?: number, height?: number) => void
export type IScrollCallback = (completed?: boolean, userCancelled?: boolean) => void

interface IScrollAnimation {
  callback?: IScrollCallback
  complete: boolean
  distance: number
  duration: number
  endPosition: number
  lastScrollPosition: number
  nextAnimationFrame?: number
  startPosition: number
  startTime: number | null
}

let scrollAnimation: IScrollAnimation | null = null

const getScrollHeight = (): number => {
  const body = document.body
  const clientHeight = (document.documentElement && document.documentElement.clientHeight) || 0
  const scrollHeight = (document.documentElement && document.documentElement.scrollHeight) || 0
  const offsetHeight = (document.documentElement && document.documentElement.offsetHeight) || 0
  return Math.max(body.scrollHeight, body.offsetHeight, clientHeight, scrollHeight, offsetHeight)
}

export class WindowController {
  public height = window.innerHeight
  public scrollHeight = getScrollHeight()
  public scrollPosition = window.scrollY
  public width = window.innerWidth

  public onUserScroll?: IUserScrollListener | null
  public onScroll?: IScrollListener | null
  public onResize?: IResizeListener | null

  private scrollUpdateRequested = false
  private windowSizeUpdateRequested = false
  private resizeInProgress: boolean = false
  private resizeTimeout: NodeJS.Timeout | undefined
  private easingFunction = BezierEasing(0.42, 0, 0.58, 1)
  private registered = false

  constructor() {
    this.register()
  }

  public register() {
    if (!this.registered) {
      window.addEventListener('wheel', this.mouseWheelEvent, { passive: true })
      window.addEventListener('scroll', this.updateScrollPosition, { passive: true })
      window.addEventListener('resize', this.updateWindowSize, { passive: true })
      this.registered = true
    }
  }

  public unregister() {
    if (this.registered) {
      window.removeEventListener('wheel', this.mouseWheelEvent)
      window.removeEventListener('scroll', this.updateScrollPosition)
      window.removeEventListener('resize', this.updateWindowSize)
      this.registered = false
    }
  }

  public scrollToPosition = (
    position: number,
    duration: number = 0,
    callback?: IScrollCallback
  ) => {
    if (scrollAnimation) {
      this.cancelScrollAnimation()
    }
    if (position !== window.scrollY) {
      scrollAnimation = {
        callback,
        complete: false,
        distance: position - window.scrollY,
        duration,
        endPosition: position,
        lastScrollPosition: window.scrollY,
        startPosition: window.scrollY,
        startTime: null,
      }
      if (scrollAnimation.duration) {
        scrollAnimation.nextAnimationFrame = window.requestAnimationFrame(this.stepScrollPosition)
      } else {
        window.scrollTo({ top: position })
        scrollAnimation.lastScrollPosition = window.scrollY
      }
    } else {
      if (callback) {
        callback(false, false)
      }
    }
  }

  private mouseWheelEvent = (event: WheelEvent) => {
    if (event.wheelDeltaY) {
      this.cancelScrollAnimation(true)
    }
  }

  private updateScrollPosition = (event?: Event) => {
    if (!this.scrollUpdateRequested) {
      const scrollPosition = window.scrollY
      window.requestAnimationFrame(() => {
        this.scrollHeight = getScrollHeight()
        this.scrollPosition = window.scrollY

        const samePositionAsLastScroll =
          scrollAnimation &&
          scrollAnimation.complete &&
          scrollAnimation.lastScrollPosition !== scrollPosition
        const userScrolled = !scrollAnimation && !this.resizeInProgress && !samePositionAsLastScroll

        if (this.onScroll) {
          this.onScroll(window.scrollY, userScrolled)
        }

        this.checkScrollAnimationComplete(scrollPosition)
        this.scrollUpdateRequested = false
      })
      this.scrollUpdateRequested = true
    }
  }

  private updateWindowSize = (event?: Event) => {
    this.resizeInProgress = true
    this.cancelScrollAnimation()

    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout)
      this.resizeTimeout = undefined
    }

    if (!this.windowSizeUpdateRequested) {
      const widthAtRequest = window.innerWidth
      const heightAtRequest = window.innerHeight
      window.requestAnimationFrame(() => {
        this.height = window.innerHeight
        this.scrollHeight = getScrollHeight()
        this.width = window.innerWidth

        if (this.onResize) {
          this.onResize(window.innerWidth, window.innerHeight)
        }

        this.resizeTimeout = setTimeout(() => {
          if (widthAtRequest === window.innerWidth && heightAtRequest === window.innerHeight) {
            this.resizeInProgress = false
          }
        }, 200)

        this.windowSizeUpdateRequested = false
      })
      this.windowSizeUpdateRequested = true
    }
  }

  private stepScrollPosition = (timestamp: number) => {
    if (scrollAnimation) {
      if (!scrollAnimation.startTime) {
        scrollAnimation.startTime = timestamp
      }

      if (window.scrollY === scrollAnimation.lastScrollPosition) {
        const timeSpent = timestamp - scrollAnimation.startTime
        const percentComplete = timeSpent / scrollAnimation.duration
        const nextScrollPosition =
          scrollAnimation.startPosition +
          scrollAnimation.distance * this.easingFunction(percentComplete)
        window.scrollTo({ top: nextScrollPosition })
        scrollAnimation.lastScrollPosition = window.scrollY

        if (timeSpent < scrollAnimation.duration) {
          scrollAnimation.nextAnimationFrame = window.requestAnimationFrame(this.stepScrollPosition)
        }
      } else {
        this.cancelScrollAnimation(true)
      }
    }
  }

  private cancelScrollAnimation = (cancelledByUser = false) => {
    if (scrollAnimation) {
      scrollAnimation.complete = true
      if (scrollAnimation.nextAnimationFrame !== undefined) {
        window.cancelAnimationFrame(scrollAnimation.nextAnimationFrame)
        scrollAnimation.nextAnimationFrame = undefined
      }
      if (scrollAnimation.callback) {
        scrollAnimation.callback(false, cancelledByUser)
      }
      if (this.onScroll && cancelledByUser) {
        this.onScroll(window.scrollY, cancelledByUser)
      }
    }
  }

  private checkScrollAnimationComplete = (position: number) => {
    if (scrollAnimation && !scrollAnimation.complete && position === scrollAnimation.endPosition) {
      scrollAnimation.complete = true
      if (scrollAnimation.nextAnimationFrame !== undefined) {
        window.cancelAnimationFrame(scrollAnimation.nextAnimationFrame)
        scrollAnimation.nextAnimationFrame = undefined
      }

      if (scrollAnimation.callback) {
        scrollAnimation.callback(true, false)
      }
    }
  }
}
