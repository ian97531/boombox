import { IEpisode } from '@boombox/shared/src/types/models/episode'
import { IStatement } from '@boombox/shared/src/types/models/transcript'
import ConversationPanel from 'components/ConversationPanel'
import Player from 'components/player/Player'
import { WindowEventsConsumer } from 'components/WindowEvents'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { connect } from 'react-redux'
import { RouteComponentProps, withRouter } from 'react-router'
import { Dispatch } from 'redux'
import { getEpisode } from 'store/actions/episodes'
import { playerCurrentTimeSeek } from 'store/actions/player'
import { IEpisodesStore } from 'store/reducers/episodes'
import { IPlayerStore } from 'store/reducers/player'
import './EpisodePage.css'

interface IEpisodeRouterProps {
  episodeSlug: string
  podcastSlug: string
}

interface IEpisodePageRouterProps extends RouteComponentProps<IEpisodeRouterProps> {}

interface IEpisodePageProps extends IEpisodePageRouterProps {
  audioTime: number
  episode: IEpisode | undefined
  podcastSlug: string
  episodeSlug: string
  dispatch: Dispatch
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
  }

  public render() {
    let episodeConversationPanel: React.ReactNode | null = null
    let player: React.ReactNode | null = null

    return (
      <WindowEventsConsumer>
        {windowContext => {
          if (this.props.episode) {
            episodeConversationPanel = (
              <ConversationPanel
                audioTime={this.props.audioTime}
                onDisableSyncToAudio={this.disableSyncToAudio}
                onEnableSyncToAudio={this.enableSyncToAudio}
                onStatementClick={this.statementClick}
                requestedEpisodeSlug={this.props.episode.slug}
                requestedPodcastSlug={this.props.episode.podcastSlug}
                windowEvents={windowContext}
              />
            )
            // TODO(ndrwhr): This should be rendered in the App so that the user can keep listening
            // to the current podcast while browsing around. To do this we will have to rework the store
            // so that the currently episode information isn't tightly coupled with the router.
            player = ReactDOM.createPortal(
              <Player
                audioUrl={this.props.episode.mp3URL}
                scrollScrub={this.state.scrollScrub}
                windowEvents={windowContext}
              />,
              document.querySelector('.App__player') as Element
            )
          }
          return (
            <div className="EpisodePage">
              {episodeConversationPanel}
              {player}
            </div>
          )
        }}
      </WindowEventsConsumer>
    )
  }

  private disableSyncToAudio = () => {
    console.log('disable audio sync')
    this.setState({
      scrollScrub: true,
    })
  }

  private enableSyncToAudio = () => {
    this.setState({
      scrollScrub: false,
    })
  }

  private statementClick = (statement: IStatement) => {
    this.props.dispatch(playerCurrentTimeSeek(statement.startTime))
  }
}

const mapStateToProps = (
  { episodes, player }: { episodes: IEpisodesStore; player: IPlayerStore },
  ownProps: IEpisodePageRouterProps
) => {
  const podcastSlug = ownProps.match.params.podcastSlug
  const episodeSlug = ownProps.match.params.episodeSlug
  const episode = episodes.episodes[podcastSlug]
    ? episodes.episodes[podcastSlug][episodeSlug]
    : undefined

  return {
    // TODO(ndrwhr): Add error handling case (i.e. if the episode id isn't in the episodes store).
    audioTime: player.currentTime,
    episode,
    episodeSlug,
    podcastSlug,
  }
}

export default withRouter(connect(mapStateToProps)(EpisodePage))
