import * as React from 'react'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'
import { setCurrentScrollPosition, setCurrentWindowSize } from 'store/actions/windowEvents'

interface IWindowEventsProps {
  dispatch: Dispatch
}

class WindowEvents extends React.Component<IWindowEventsProps> {
  private updateScrollPosition: (event: Event) => void
  private updateWindowSize: (event: Event) => void

  public componentDidMount() {
    let currentScrollPosition = window.scrollY
    let scrollUpdateRequested = false
    this.updateScrollPosition = event => {
      currentScrollPosition = window.scrollY
      if (!scrollUpdateRequested) {
        window.requestAnimationFrame(() => {
          this.props.dispatch(setCurrentScrollPosition(currentScrollPosition))
          scrollUpdateRequested = false
        })
        scrollUpdateRequested = true
      }
    }
    window.addEventListener('scroll', this.updateScrollPosition)
    this.props.dispatch(setCurrentScrollPosition(window.scrollY))

    let currentWidth = window.innerWidth
    let currentHeight = window.innerHeight
    let sizeUpdateRequested = false
    this.updateWindowSize = event => {
      currentWidth = window.innerWidth
      currentHeight = window.innerHeight
      if (!sizeUpdateRequested) {
        window.requestAnimationFrame(() => {
          this.props.dispatch(setCurrentWindowSize(currentWidth, currentHeight))
          sizeUpdateRequested = false
        })
        sizeUpdateRequested = true
      }
    }
    window.addEventListener('resize', this.updateWindowSize)
    this.props.dispatch(setCurrentWindowSize(window.innerWidth, window.innerHeight))
  }

  public componentWillUnmount() {
    window.removeEventListener('scroll', this.updateScrollPosition)
    window.removeEventListener('resize', this.updateWindowSize)
  }

  public render() {
    return <div>{this.props.children}</div>
  }
}

export default connect()(WindowEvents)
