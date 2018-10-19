import * as React from 'react'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'
import { setCurrentScrollPosition, setCurrentWindowSize } from 'store/actions/windowEvents'
import { IWindowEventsStore } from 'store/reducers/windowEvents'

interface IWindowEventsProps {
  dispatch: Dispatch
  requestedScrollDuration: number
  requestedScrollPosition: number
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
  private scrollAnimationStartTime: number | null

  private listeningForScrollEvents = false
  private resizeTimeout: NodeJS.Timeout

  public componentDidMount() {
    this.listenForScrollEvents()
    window.addEventListener('resize', this.updateWindowSize, { passive: true })
    this.props.dispatch(setCurrentScrollPosition(this.scrollPosition))
    this.props.dispatch(setCurrentWindowSize(this.windowWidth, this.windowHeight))
  }

  public componentWillUnmount() {
    this.stopListeningForScrollEvents()
    window.removeEventListener('resize', this.updateWindowSize)
  }

  public render() {
    return <div>{this.props.children}</div>
  }

  public componentDidUpdate(prevProps: IWindowEventsProps) {
    if (
      this.props.requestedScrollPosition &&
      this.props.requestedScrollPosition !== prevProps.requestedScrollPosition
    ) {
      this.scrollToPosition(this.props.requestedScrollPosition, this.props.requestedScrollDuration)
    }
  }

  private listenForScrollEvents = () => {
    if (!this.listeningForScrollEvents) {
      window.addEventListener('scroll', this.updateScrollPosition, { passive: true })
      this.listeningForScrollEvents = true
    }
  }

  private stopListeningForScrollEvents = () => {
    if (this.listeningForScrollEvents) {
      window.removeEventListener('scroll', this.updateScrollPosition)
      this.listeningForScrollEvents = false
    }
  }

  private updateScrollPosition = (event: Event) => {
    this.scrollPosition = window.scrollY
    if (!this.scrollUpdateRequested) {
      window.requestAnimationFrame(() => {
        this.props.dispatch(setCurrentScrollPosition(this.scrollPosition, true))
        this.scrollUpdateRequested = false
      })
      this.scrollUpdateRequested = true
    }
  }

  private updateWindowSize = (event: Event) => {
    this.stopListeningForScrollEvents()
    this.windowWidth = window.innerWidth
    this.windowHeight = window.innerHeight
    this.scrollAnimationInterrupted = true
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout)
    }
    this.resizeTimeout = setTimeout(this.listenForScrollEvents, 1000)
    if (!this.windowSizeUpdateRequested) {
      window.requestAnimationFrame(() => {
        this.props.dispatch(setCurrentWindowSize(this.windowWidth, this.windowHeight))
        this.windowSizeUpdateRequested = false
      })
      this.windowSizeUpdateRequested = true
    }
  }

  private scrollToPosition(position: number, duration: number) {
    this.stopListeningForScrollEvents()
    if (duration) {
      this.scrollAnimationDuration = duration
      this.scrollAnimationInterrupted = false
      this.scrollAnimationStartPosition = window.scrollY
      this.scrollAnimationDistance = position - this.scrollAnimationStartPosition
      this.scrollAnimationStartTime = null
      window.requestAnimationFrame(this.stepScrollPosition)
    } else {
      window.scrollTo({ top: position })
      this.listenForScrollEvents()
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
        window.requestAnimationFrame(this.stepScrollPosition)
      } else {
        complete = true
      }
    } else {
      complete = true
    }

    if (complete) {
      this.props.dispatch(setCurrentScrollPosition(this.scrollPosition, cancelled))
      this.listenForScrollEvents()
    }
  }

  private cubicEaseInOut = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
  }
}

function mapStateToProps({ windowEvents }: { windowEvents: IWindowEventsStore }) {
  return {
    requestedScrollDuration: windowEvents.requestedScrollDuration,
    requestedScrollPosition: windowEvents.requestedScrollPosition,
  }
}

export default connect(mapStateToProps)(WindowEvents)
