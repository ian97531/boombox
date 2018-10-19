import * as React from 'react'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'
import { setCurrentScrollPosition } from 'store/actions/windowEvents'

interface IWindowEventsProps {
  dispatch: Dispatch
}

class WindowEvents extends React.Component<IWindowEventsProps> {
  private updateScrollPositionCallback: (event: Event) => void

  public componentDidMount() {
    let currentScrollPosition = 0
    let updateRequested = false
    this.updateScrollPositionCallback = event => {
      currentScrollPosition = window.scrollY
      if (!updateRequested) {
        window.requestAnimationFrame(() => {
          this.props.dispatch(setCurrentScrollPosition(currentScrollPosition))
          updateRequested = false
        })
        updateRequested = true
      }
    }
    window.addEventListener('scroll', this.updateScrollPositionCallback)
    this.props.dispatch(setCurrentScrollPosition(window.scrollY))
  }

  public componentWillUnmount() {
    window.removeEventListener('scroll', this.updateScrollPositionCallback)
  }

  public render() {
    return <div>{this.props.children}</div>
  }
}

export default connect()(WindowEvents)
