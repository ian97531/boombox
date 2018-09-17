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

class ConversationPanel extends React.Component<IConversationPanelProps> {
  public render() {
    return (
      <div className="ConversationPanel">
        {this.props.statements.map(statement => (
          <Statement key={statement.startTime} {...statement} />
        ))}
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
