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
}

interface IConversationPanelState {
  activeStatementElement: Element
  activeStatementBounds: ClientRect | DOMRect
  conversationPanelBounds: ClientRect | DOMRect
  syncScrollPosition: boolean
}

class ConversationPanel extends React.Component<IConversationPanelProps, IConversationPanelState> {
  private conversationPanelRef = React.createRef<HTMLDivElement>()

  public render() {
    let styles: object
    if (this.state && this.state.activeStatementBounds) {
      const top =
        this.state.activeStatementBounds.top -
        this.state.conversationPanelBounds.top +
        this.state.activeStatementBounds.height / 2
      const height = this.state.activeStatementBounds.height
      const width = this.state.activeStatementBounds.width
      styles = {
        height: 1,
        transform: `translateY(${top}px) scaleY(${height})`,
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
              activeCallback={this.updateSelection}
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

    window.addEventListener('resize', this.updateSelectionListener)
    window.addEventListener('scroll', this.scrollListener)
    this.updateSelection()
  }

  public componentWillUnmount() {
    window.removeEventListener('resize', this.updateSelectionListener)
    window.removeEventListener('scroll', this.scrollListener)
  }

  private scrollListener = (event: Event) => {
    console.log(event)
  }

  private updateSelectionListener = () => {
    this.updateSelection()
  }

  private updateSelection = (activeRef?: React.RefObject<HTMLDivElement>) => {
    const activeStatementElement: Element =
      activeRef && activeRef.current
        ? activeRef.current
        : this.state && this.state.activeStatementElement

    if (activeStatementElement && this.conversationPanelRef && this.conversationPanelRef.current) {
      const activeStatementBounds = activeStatementElement.getBoundingClientRect()
      const conversationPanelBounds = this.conversationPanelRef.current.getBoundingClientRect()

      // The request animation frame here is not needed, but it helps to sync up the highlight
      // motion with the scroll.
      window.requestAnimationFrame(() => {
        this.setState({
          activeStatementBounds,
          activeStatementElement,
          conversationPanelBounds,
        })
      })
      const scrollPosition = activeStatementBounds.top - conversationPanelBounds.top
      this.props.dispatch(scrollToPosition(scrollPosition, 300))
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
    currentScrollPosition: windowEvents.currentScrollPosition,
    scrollAnimationCancelled: windowEvents.scrollAnimationCancelled,
  }
}

export default connect(mapStateToProps)(ConversationPanel)
