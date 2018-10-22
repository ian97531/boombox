import { IEpisode } from '@boombox/shared/src/types/models/episode'
import { IStatement } from '@boombox/shared/src/types/models/transcript'
import ConversationPanel from 'components/ConversationPanel'
import Player from 'components/player/Player'
import { WindowContext } from 'components/WindowContext'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { connect } from 'react-redux'
import { RouteComponentProps, withRouter } from 'react-router'
import { Dispatch } from 'redux'
import { getEpisode } from 'store/actions/episodes'
import { playerCurrentTimeSeek } from 'store/actions/player'
import { getStatements } from 'store/actions/statements'
import { IEpisodesStore } from 'store/reducers/episodes'
import { IPlayerStore } from 'store/reducers/player'
import { IStatementsStore } from 'store/reducers/statements'
import './EpisodePage.css'

interface IEpisodeRouterProps {
  episodeSlug: string
  podcastSlug: string
}

interface IEpisodePageRouterProps extends RouteComponentProps<IEpisodeRouterProps> {}

interface IEpisodePageProps extends IEpisodePageRouterProps {
  audioTime: number
  dispatch: Dispatch
  episode: IEpisode | undefined
  episodeSlug: string
  podcastSlug: string
  statements: IStatement[] | undefined
}

interface IEpisodeState {
  scrollScrub: boolean
}

const initialState: IEpisodeState = {
  scrollScrub: false,
}

class EpisodePage extends React.Component<IEpisodePageProps, IEpisodeState> {
  public readonly state: IEpisodeState = initialState

  public componentDidMount() {
    // HACK(ndrwhr): Fetch the episode if it's not found, this will cause in infinite fetching
    // loop if the id is never found.
    if (!this.props.episode) {
      const podcastSlug = this.props.podcastSlug
      const episodeSlug = this.props.episodeSlug
      this.props.dispatch(getEpisode({ podcastSlug, episodeSlug }))
    }

    if (!this.props.statements) {
      const podcastSlug = this.props.podcastSlug
      const episodeSlug = this.props.episodeSlug
      this.props.dispatch(getStatements({ podcastSlug, episodeSlug }))
    }
  }

  public render() {
    let episodeConversationPanel: React.ReactNode | null = null
    let player: React.ReactNode | null = null
    if (this.props.episode && this.props.statements) {
      episodeConversationPanel = (
        <ConversationPanel
          audioTime={this.props.audioTime}
          onDisableSyncToAudio={this.onDisableSyncToAudio}
          onEnableSyncToAudio={this.onEnableSyncToAudio}
          onStatementClick={this.onStatementClick}
          statements={this.props.statements}
        />
      )
      // TODO(ndrwhr): This should be rendered in the App so that the user can keep listening
      // to the current podcast while browsing around. To do this we will have to rework the store
      // so that the currently episode information isn't tightly coupled with the router.
      const episodeAudioUrl = this.props.episode.mp3URL
      const scrollScrub = this.state.scrollScrub
      player = ReactDOM.createPortal(
        <WindowContext>
          {({ height, scrollHeight, scrollPosition }) => {
            return (
              <Player
                audioUrl={episodeAudioUrl}
                scrubProgressPercent={
                  scrollScrub ? scrollPosition / (scrollHeight - height) : undefined
                }
              />
            )
          }}
        </WindowContext>,
        document.querySelector('.App__player') as Element
      )
    }
    return (
      <div className="EpisodePage">
        {episodeConversationPanel}
        {player}
      </div>
    )
  }

  private onDisableSyncToAudio = () => {
    this.setState({
      scrollScrub: true,
    })
  }

  private onEnableSyncToAudio = () => {
    this.setState({
      scrollScrub: false,
    })
  }

  private onStatementClick = (statement: IStatement) => {
    this.props.dispatch(playerCurrentTimeSeek(statement.startTime))
  }
}

const mapStateToProps = (
  {
    episodes,
    player,
    statements,
  }: { episodes: IEpisodesStore; player: IPlayerStore; statements: IStatementsStore },
  ownProps: IEpisodePageRouterProps
) => {
  const podcastSlug = ownProps.match.params.podcastSlug
  const episodeSlug = ownProps.match.params.episodeSlug
  const episode = episodes.episodes[podcastSlug]
    ? episodes.episodes[podcastSlug][episodeSlug]
    : undefined
  const episodeStatements =
    statements.episodes[podcastSlug] && statements.episodes[podcastSlug][episodeSlug]
      ? statements.episodes[podcastSlug][episodeSlug].statements
      : undefined

  return {
    // TODO(ndrwhr): Add error handling case (i.e. if the episode id isn't in the episodes store).
    audioTime: player.currentTime,
    episode,
    episodeSlug,
    podcastSlug,
    statements: episodeStatements,
  }
}

export default withRouter(connect(mapStateToProps)(EpisodePage))
