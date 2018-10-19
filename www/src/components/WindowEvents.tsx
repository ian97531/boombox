import * as React from 'react'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'
import {
  updateCurrentScrollPosition,
  updateCurrentWindowSize,
  updateScrollComplete,
} from 'store/actions/windowEvents'
import { IWindowEventsStore } from 'store/reducers/windowEvents'

interface IWindowEventsProps {
  dispatch: Dispatch
  height: number
  requestedScrollDuration: number
  requestedScrollPosition: number
  scrollPosition: number
  width: number
}

class WindowEvents extends React.Component<IWindowEventsProps> {
  private scrollPosition = window.scrollY
  private scrollUpdateRequested = false
  private windowHeight = window.innerHeight
  private windowWidth = window.innerWidth
  private windowSizeUpdateRequested = false

  private scrollAnimationDistance: number
  private scrollAnimationDuration: number
  private scrollAnimationInterrupted: boolean
  private scrollAnimationStartPosition: number
  private scrollAnimationEndPosition: number | null
  private scrollAnimationStartTime: number | null
  private scrollAnimationInProgress = false
  private scrollAnimationRaf: number | null

  private resizeInProgress = false

  public componentDidMount() {
    window.addEventListener('wheel', this.mouseWheelEvent, { passive: true })
    window.addEventListener('scroll', this.updateScrollPosition, { passive: true })
    window.addEventListener('resize', this.updateWindowSize, { passive: true })
    this.props.dispatch(updateCurrentScrollPosition(this.scrollPosition))
    this.props.dispatch(updateCurrentWindowSize(this.windowWidth, this.windowHeight))
  }

  public componentWillUnmount() {
    window.removeEventListener('wheel', this.mouseWheelEvent)
    window.removeEventListener('scroll', this.updateScrollPosition)
    window.removeEventListener('resize', this.updateWindowSize)
  }

  public render() {
    return <div>{this.props.children}</div>
  }

  public componentDidUpdate(prevProps: IWindowEventsProps) {
    if (
      this.props.requestedScrollPosition !== null &&
      this.props.requestedScrollPosition !== this.scrollAnimationEndPosition
    ) {
      this.scrollToPosition(this.props.requestedScrollPosition, this.props.requestedScrollDuration)
    }

    if (
      !this.props.requestedScrollPosition &&
      this.scrollAnimationInProgress &&
      this.props.scrollPosition === this.scrollAnimationEndPosition
    ) {
      this.scrollAnimationInProgress = false
      this.scrollAnimationEndPosition = null
    }

    if (
      this.props.width === this.windowWidth &&
      this.props.height === this.windowHeight &&
      !this.windowSizeUpdateRequested
    ) {
      this.resizeInProgress = false
    }
  }

  private mouseWheelEvent = (event: WheelEvent) => {
    if (event.wheelDeltaY && this.scrollAnimationInProgress) {
      this.scrollAnimationInterrupted = true
    }
  }

  private updateScrollPosition = (event: Event) => {
    this.scrollPosition = window.scrollY

    if (!this.scrollUpdateRequested) {
      window.requestAnimationFrame(() => {
        const userScrolled = !this.scrollAnimationInProgress && !this.resizeInProgress
        this.props.dispatch(updateCurrentScrollPosition(this.scrollPosition, userScrolled))
        this.scrollUpdateRequested = false
      })
      this.scrollUpdateRequested = true
    }
  }

  private updateWindowSize = (event: Event) => {
    this.resizeInProgress = true
    this.scrollAnimationInterrupted = true
    this.windowWidth = window.innerWidth
    this.windowHeight = window.innerHeight

    if (!this.windowSizeUpdateRequested) {
      window.requestAnimationFrame(() => {
        this.props.dispatch(updateCurrentWindowSize(this.windowWidth, this.windowHeight))
        this.windowSizeUpdateRequested = false
      })
      this.windowSizeUpdateRequested = true
    }
  }

  private scrollToPosition(position: number, duration: number) {
    if (position !== this.scrollPosition || this.scrollAnimationInProgress) {
      if (this.scrollAnimationInProgress) {
        if (this.scrollAnimationRaf) {
          cancelAnimationFrame(this.scrollAnimationRaf)
        }
      }

      this.scrollAnimationInProgress = true
      this.scrollAnimationEndPosition = position
      if (duration) {
        this.scrollAnimationDuration = duration
        this.scrollAnimationInterrupted = false
        this.scrollAnimationStartPosition = this.scrollPosition
        this.scrollAnimationDistance = position - this.scrollAnimationStartPosition
        this.scrollAnimationStartTime = null
        this.scrollAnimationRaf = window.requestAnimationFrame(this.stepScrollPosition)
      } else {
        window.scrollTo({ top: position })
      }
    }
  }

  private stepScrollPosition = (timestamp: number) => {
    const cancelled = this.scrollAnimationInterrupted || window.scrollY !== this.scrollPosition
    let complete = false
    if (!this.scrollAnimationStartTime) {
      this.scrollAnimationStartTime = timestamp
    }

    if (!cancelled) {
      const progress = timestamp - this.scrollAnimationStartTime
      const percentComplete = progress / this.scrollAnimationDuration
      const nextPosition =
        this.scrollAnimationStartPosition +
        this.scrollAnimationDistance * this.cubicEaseInOut(percentComplete)
      window.scrollTo({ top: nextPosition })
      this.scrollPosition = window.scrollY

      if (progress < this.scrollAnimationDuration) {
        this.scrollAnimationRaf = window.requestAnimationFrame(this.stepScrollPosition)
      } else {
        complete = true
      }
    } else {
      complete = true
    }

    if (complete) {
      this.props.dispatch(updateScrollComplete(cancelled, !this.resizeInProgress))
    }
  }

  private cubicEaseInOut = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
  }
}

function mapStateToProps({ windowEvents }: { windowEvents: IWindowEventsStore }) {
  return {
    height: windowEvents.height,
    requestedScrollDuration: windowEvents.requestedScrollDuration,
    requestedScrollPosition: windowEvents.requestedScrollPosition,
    scrollPosition: windowEvents.scrollPosition,
    width: windowEvents.width,
  }
}

export default connect(mapStateToProps)(WindowEvents)
