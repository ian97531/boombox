import * as React from 'react'
import { WindowController } from 'utilities/WindowController'

export type IResizeListener = (width?: number, height?: number, scrollHeight?: number) => void
export type IUserScrollListener = (position?: number, scrollHeight?: number) => void
export type IScrollCancelledListener = (userCancelled?: boolean) => void

export interface IWindowState {
  height: number
  scrollHeight: number
  scrollPosition: number
  width: number
}

interface IWindowConsumerProps {
  children?: (windowContext: IWindowState) => React.ReactNode
  onResize?: IResizeListener
  onUserScroll?: IUserScrollListener
  onScrollCancelled?: IScrollCancelledListener
  scrollDuration?: number
  scrollPosition?: number
}

const initialState: IWindowState = {
  height: 0,
  scrollHeight: 0,
  scrollPosition: 0,
  width: 0,
}

export class WindowContext extends React.Component<IWindowConsumerProps, IWindowState> {
  public readonly state: IWindowState = initialState

  public controller = new WindowController()

  public componentDidMount() {
    this.setState({
      height: this.controller.height,
      scrollHeight: this.controller.scrollHeight,
      scrollPosition: this.controller.scrollPosition,
      width: this.controller.width,
    })
    this.controller.onResize = this.onResize
    this.controller.onScroll = this.onScroll
  }

  public componentWillUnmount() {
    this.controller.onResize = null
    this.controller.onScroll = null
  }

  public render() {
    return this.props.children ? this.props.children(this.state) : null
  }

  public componentDidUpdate(prevProps: IWindowConsumerProps) {
    if (
      this.props.scrollPosition !== undefined &&
      this.props.scrollPosition !== prevProps.scrollPosition
    ) {
      this.controller.scrollToPosition(
        this.props.scrollPosition,
        this.props.scrollDuration,
        this.onScrollComplete
      )
    }
  }

  private onResize = (width: number, height: number) => {
    this.setState({
      height,
      scrollHeight: this.controller.scrollHeight,
      width,
    })

    if (this.props.onResize) {
      this.props.onResize(width, height, this.controller.scrollHeight)
    }
  }

  private onScroll = (scrollPosition: number, userScrolled: boolean) => {
    this.setState({
      scrollHeight: this.controller.scrollHeight,
      scrollPosition,
    })

    if (this.props.onUserScroll && userScrolled) {
      this.props.onUserScroll(scrollPosition, this.controller.scrollHeight)
    }
  }

  private onScrollComplete = (completed: boolean, userCancelled: boolean) => {
    if (this.props.onScrollCancelled && !completed) {
      this.props.onScrollCancelled(userCancelled)
    }
  }
}
