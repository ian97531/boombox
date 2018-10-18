import Statement from 'components/Statement'
import * as React from 'react'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'
import { getStatements } from 'store/actions/statements'
import { IStatementsStore } from 'store/reducers/statements'
import './ConversationPanel.css'

interface IConversationPanelProps extends IStatementsStore {
  dispatch: Dispatch
  requestedEpisodeSlug: string
  requestedPodcastSlug: string
}

interface IConversationPanelState {
  activeElement: HTMLDivElement
}

class ConversationPanel extends React.Component<IConversationPanelProps, IConversationPanelState> {
  public conversationPanelRef = React.createRef<HTMLDivElement>()

  public setActiveElement = (activeRef: React.RefObject<HTMLDivElement>) => {
    if (
      activeRef.current &&
      (this.state === null || activeRef.current !== this.state.activeElement)
    ) {
      const activeElement = activeRef.current
      this.setState({ activeElement })
    }
  }

  public render() {
    let highightElement: React.ReactNode | null = null

    if (this.state && this.state.activeElement && this.conversationPanelRef.current) {
      const parentRect = this.conversationPanelRef.current.getBoundingClientRect()
      const statementRect = this.state.activeElement.getBoundingClientRect()
      const y = statementRect.top - parentRect.top + statementRect.height / 2
      const styles = {
        height: 1,
        transform: `translateY(${y}px) scaleY(${statementRect.height})`,
      }
      highightElement = <div className="ConversationPanel__statement-hightlight" style={styles} />
    } else {
      highightElement = <div className="ConversationPanel__statement-hightlight" />
    }

    return (
      <div className="ConversationPanel" ref={this.conversationPanelRef}>
        {highightElement}
        <div className="ConversationPanel__statement-list">
          {this.props.statements.map(statement => (
            <Statement
              activeCallback={this.setActiveElement}
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
}

function mapStateToProps({ statements }: { statements: IStatementsStore }) {
  return statements
}

export default connect(mapStateToProps)(ConversationPanel)
