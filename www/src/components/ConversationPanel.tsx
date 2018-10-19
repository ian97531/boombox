import Statement from 'components/Statement'
import * as React from 'react'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'
import { getStatements } from 'store/actions/statements'
import { scrollToPosition } from 'store/actions/windowEvents'
import { IStatementsStore } from 'store/reducers/statements'
import { IWindowEventsStore } from 'store/reducers/windowEvents'
import './ConversationPanel.css'

interface IConversationPanelProps extends IStatementsStore {
  dispatch: Dispatch
  requestedEpisodeSlug: string
  requestedPodcastSlug: string
  userScrolled: boolean
  windowHeight: number
  windowWidth: number
}

interface IConversationPanelState {
  activeStatementBounds?: ClientRect | DOMRect
  conversationPanelBounds?: ClientRect | DOMRect
  syncScrollPosition: boolean
}

const initialState: IConversationPanelState = {
  syncScrollPosition: true,
}

class ConversationPanel extends React.Component<IConversationPanelProps, IConversationPanelState> {
  public readonly state: IConversationPanelState = initialState
  private conversationPanelRef = React.createRef<HTMLDivElement>()
  private activeStatementRef?: React.RefObject<HTMLDivElement>
  private animate: boolean = true

  public render() {
    let styles: object
    if (this.state.activeStatementBounds && this.state.conversationPanelBounds) {
      const top =
        this.state.activeStatementBounds.top -
        this.state.conversationPanelBounds.top +
        this.state.activeStatementBounds.height / 2
      const height = this.state.activeStatementBounds.height
      const width = this.state.activeStatementBounds.width
      styles = {
        height: 1,
        transform: `translateY(${top}px) scaleY(${height})`,
        transitionProperty: this.animate ? 'transform' : 'none',
        width,
      }
    } else {
      styles = {
        height: 0,
        width: '100%',
      }
    }

    return (
      <div className="ConversationPanel" ref={this.conversationPanelRef}>
        <div className="ConversationPanel__statement-hightlight" style={styles} />
        <div className="ConversationPanel__statement-list">
          {this.props.statements.map(statement => (
            <Statement
              activeCallback={this.updateActiveStatementRef}
              key={statement.startTime}
              {...statement}
            />
          ))}
        </div>
      </div>
    )
  }

  public componentDidMount() {
    if (this.props.episodeSlug !== this.props.requestedEpisodeSlug) {
      this.props.dispatch(
        getStatements({
          episodeSlug: this.props.requestedEpisodeSlug,
          podcastSlug: this.props.requestedPodcastSlug,
        })
      )
    }
  }

  public componentDidUpdate(prevProps: IConversationPanelProps) {
    // Turn animations back on if we just rendered without them. This happens when the window
    // resizes and the highlights and scroll positions need to be updated without animations.
    if (this.animate === false) {
      this.animate = true
    }

    // If the user scrolls, disable scroll syncing.
    if (this.state.syncScrollPosition && this.props.userScrolled) {
      this.setState({
        syncScrollPosition: false,
      })
    }

    // If the window is resized, re-render the active statement highlight and reset the scroll
    // position without any animation.
    if (
      this.props.windowWidth !== prevProps.windowWidth ||
      this.props.windowHeight !== prevProps.windowHeight
    ) {
      this.animate = false
      this.updateSelection()
    }
  }

  private updateActiveStatementRef = (activeRef: React.RefObject<HTMLDivElement>) => {
    if (this.activeStatementRef !== activeRef) {
      this.activeStatementRef = activeRef
      this.updateSelection()
    }
  }

  private updateSelection = () => {
    if (
      this.activeStatementRef &&
      this.activeStatementRef.current &&
      this.conversationPanelRef.current
    ) {
      const activeStatementBounds = this.activeStatementRef.current.getBoundingClientRect()
      const conversationPanelBounds = this.conversationPanelRef.current.getBoundingClientRect()

      // This helps syncronize the highlight animation with the scroll animation.
      window.requestAnimationFrame(() => {
        this.setState({
          activeStatementBounds,
          conversationPanelBounds,
        })
      })

      if (this.state.syncScrollPosition) {
        const duration = this.animate ? 300 : 0
        const position = activeStatementBounds.top - conversationPanelBounds.top
        this.props.dispatch(scrollToPosition(position, duration))
      }
    }
  }
}

function mapStateToProps({
  statements,
  windowEvents,
}: {
  statements: IStatementsStore
  windowEvents: IWindowEventsStore
}) {
  return {
    ...statements,
    userScrolled: windowEvents.userScrolled,
    windowHeight: windowEvents.currentHeight,
    windowWidth: windowEvents.currentWidth,
  }
}

export default connect(mapStateToProps)(ConversationPanel)
