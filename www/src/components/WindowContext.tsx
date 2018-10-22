import * as React from 'react'

export type IUserScrollListener = (position?: number, scrollHeight?: number) => void
export type IResizeListener = (width?: number, height?: number, scrollHeight?: number) => void
export type IScrollCancelledListener = (userScrolled?: boolean) => void

interface IWindowState {
  height: number
  scrollHeight: number
  scrollPosition: number
  width: number
}

interface IWindowConsumerProps {
  children: (windowContext: IWindowState) => React.ReactNode
  onResize?: IResizeListener
  onUserScroll?: IUserScrollListener
  onScrollCancelled?: IScrollCancelledListener
  scrollDuration?: number
  scrollPosition?: number
}

interface IScrollAnimation {
  distance: number
  duration: number
  endPosition: number
  lastScrollPosition: number
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

const initialState: IWindowState = {
  height: window.innerHeight,
  scrollHeight: getScrollHeight(),
  scrollPosition: window.scrollY,
  width: window.innerWidth,
}

const scrollListeners: IUserScrollListener[] = []
const resizeListeners: IResizeListener[] = []

export class WindowContext extends React.Component<IWindowConsumerProps, IWindowState> {
  public static addUserScrollListener = (listener: IUserScrollListener) => {
    scrollListeners.push(listener)
  }

  public static addResizeListener = (listener: IResizeListener) => {
    resizeListeners.push(listener)
  }

  public static removeUserScrollListener = (listener: IUserScrollListener) => {
    const index = scrollListeners.indexOf(listener)
    if (index !== -1) {
      scrollListeners.splice(index, 1)
    }
  }

  public static removeResizeListener = (listener: IUserScrollListener) => {
    const index = scrollListeners.indexOf(listener)
    if (index !== -1) {
      scrollListeners.splice(index, 1)
    }
  }

  private static cubicEaseInOut = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
  }

  public readonly state: IWindowState = initialState

  private scrollUpdateRequested = false
  private windowSizeUpdateRequested = false
  private resizeInProgress: boolean = false
  private resizeTimeout: NodeJS.Timeout | undefined

  public componentDidMount() {
    window.addEventListener('wheel', this.mouseWheelEvent, { passive: true })
    window.addEventListener('scroll', this.updateScrollPosition, { passive: true })
    window.addEventListener('resize', this.updateWindowSize, { passive: true })
    this.setState({
      height: window.innerHeight,
      scrollHeight: getScrollHeight(),
      scrollPosition: window.scrollY,
      width: window.innerWidth,
    })
  }

  public componentWillUnmount() {
    window.removeEventListener('wheel', this.mouseWheelEvent)
    window.removeEventListener('scroll', this.updateScrollPosition)
    window.removeEventListener('resize', this.updateWindowSize)
  }

  public render() {
    return this.props.children(this.state)
  }

  public componentDidUpdate(prevProps: IWindowConsumerProps) {
    if (
      this.props.scrollPosition !== undefined &&
      this.props.scrollPosition !== prevProps.scrollPosition
    ) {
      this.requestScrollPosition(this.props.scrollPosition, this.props.scrollDuration)
    }
  }

  private mouseWheelEvent = (event: WheelEvent) => {
    if (event.wheelDeltaY) {
      this.cancelScrollAnimation()
    }
  }

  private updateScrollPosition = (event?: Event) => {
    if (!this.scrollUpdateRequested) {
      const scrollPosition = window.scrollY
      window.requestAnimationFrame(() => {
        const userScrolled = !scrollAnimation && !this.resizeInProgress
        const scrollHeight = getScrollHeight()
        const newState: any = {
          scrollPosition: window.scrollY,
        }
        if (scrollHeight !== this.state.scrollHeight) {
          newState.scrollHeight = scrollHeight
        }
        this.setState(newState)

        if (userScrolled) {
          if (this.props.onUserScroll) {
            this.props.onUserScroll(window.scrollY)
          }
          scrollListeners.forEach(listener => listener(window.scrollY))
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
      const scrollHeight = getScrollHeight()
      window.requestAnimationFrame(() => {
        this.setState({
          height: window.innerHeight,
          scrollHeight,
          width: window.innerWidth,
        })

        if (this.props.onResize) {
          this.props.onResize(window.innerWidth, window.innerHeight, scrollHeight)
        }
        resizeListeners.forEach(listener =>
          listener(window.innerWidth, window.innerHeight, scrollHeight)
        )

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

  private requestScrollPosition = (position: number, duration: number = 0) => {
    if (!scrollAnimation && position !== window.scrollY) {
      scrollAnimation = {
        distance: position - window.scrollY,
        duration,
        endPosition: position,
        lastScrollPosition: window.scrollY,
        startPosition: window.scrollY,
        startTime: null,
      }
      if (scrollAnimation.duration) {
        window.requestAnimationFrame(this.stepScrollPosition)
      } else {
        window.scrollTo({ top: position })
        scrollAnimation.lastScrollPosition = window.scrollY
      }
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
          scrollAnimation.distance * WindowContext.cubicEaseInOut(percentComplete)
        window.scrollTo({ top: nextScrollPosition })
        scrollAnimation.lastScrollPosition = window.scrollY

        if (timeSpent < scrollAnimation.duration) {
          window.requestAnimationFrame(this.stepScrollPosition)
        }
      } else {
        this.cancelScrollAnimation()
      }
    }
  }

  private cancelScrollAnimation = () => {
    if (scrollAnimation) {
      if (this.props.onScrollCancelled) {
        const userCancelled = !this.resizeInProgress
        this.props.onScrollCancelled(userCancelled)
      }
      scrollAnimation = null
    }
  }

  private checkScrollAnimationComplete = (position: number) => {
    if (scrollAnimation && position === scrollAnimation.endPosition) {
      scrollAnimation = null
    }
  }
}
