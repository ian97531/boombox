import { IEpisode } from '@boombox/shared/src/types/models/episode'
import { IStatement } from '@boombox/shared/src/types/models/transcript'
import classNames from 'classnames'
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
import { timeBeforeStatement, timeDuringStatement } from 'utilities/statement'
import './EpisodePage.css'

const DEFAULT_ANIMATION_DURATION = 300
const FAST_ANIMATION_DURATION = 0

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
  animationDuration: number
  syncToAudio: boolean
}

const initialState: IEpisodeState = {
  animationDuration: DEFAULT_ANIMATION_DURATION,
  syncToAudio: true,
}

class EpisodePage extends React.Component<IEpisodePageProps, IEpisodeState> {
  public readonly state: IEpisodeState = initialState

  private lastSkip?: number
  private skipCountResetTimeout?: NodeJS.Timeout

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
          animationDuration={this.state.animationDuration}
          audioTime={this.props.audioTime}
          onStatementClick={this.onStatementClick}
          onUserScroll={this.onUserScroll}
          statements={this.props.statements}
          syncToAudio={this.state.syncToAudio}
        />
      )
      // TODO(ndrwhr): This should be rendered in the App so that the user can keep listening
      // to the current podcast while browsing around. To do this we will have to rework the store
      // so that the currently episode information isn't tightly coupled with the router.
      const episodeAudioUrl = this.props.episode.mp3URL
      const episodeAudioDuration = this.props.episode.duration
      const episodeBytes = this.props.episode.bytes
      const syncToAudio = this.state.syncToAudio
      player = ReactDOM.createPortal(
        <WindowContext>
          {({ height, scrollHeight, scrollPosition }) => {
            return (
              <Player
                audioDuration={episodeAudioDuration}
                audioUrl={episodeAudioUrl}
                bytes={episodeBytes}
                onSeek={this.onSeek}
                skipBackDelegate={this.skipBackDelegate}
                skipForwardDelegate={this.skipForwardDelegate}
                scrubProgressPercent={
                  !syncToAudio ? scrollPosition / (scrollHeight - height) : undefined
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
        <div
          className={classNames('EpisodePage__sync-button', {
            'EpisodePage__sync-button--active': !this.state.syncToAudio,
          })}
          onClick={this.onClickSyncButton}
        >
          Scroll to the current time.
        </div>
        {player}
      </div>
    )
  }

  private onClickSyncButton = () => {
    this.setState({
      syncToAudio: true,
    })
  }

  private onSeek = (time: number) => {
    this.setState({
      syncToAudio: true,
    })
  }

  private onStatementClick = (statement: IStatement) => {
    this.props.dispatch(playerCurrentTimeSeek(statement.startTime))
  }

  private onUserScroll = () => {
    if (this.state.syncToAudio) {
      this.setState({
        syncToAudio: false,
      })
    }
  }

  private resetSpeedSkip = () => {
    this.lastSkip = undefined
    this.skipCountResetTimeout = undefined
    this.setState({
      animationDuration: DEFAULT_ANIMATION_DURATION,
    })
  }

  // If the user is quickly skipping forward or back, reduce the scroll animation to make
  // the seek faster and easier.
  private checkSpeedSkip() {
    const now = Date.now()
    if (this.skipCountResetTimeout !== undefined) {
      clearTimeout(this.skipCountResetTimeout)
    }
    if (this.lastSkip && now - this.lastSkip < 200) {
      if (this.state.animationDuration !== FAST_ANIMATION_DURATION) {
        this.setState({
          animationDuration: FAST_ANIMATION_DURATION,
        })
      }
      this.skipCountResetTimeout = setTimeout(this.resetSpeedSkip, 400)
    } else {
      this.resetSpeedSkip()
    }

    this.lastSkip = now
  }

  private skipBackDelegate = (currentTime: number): number | void => {
    if (this.props.statements) {
      this.checkSpeedSkip()
      let previousStatement: IStatement | undefined
      const currentStatement = this.props.statements.find(statement => {
        const found =
          timeDuringStatement(currentTime, statement) || timeBeforeStatement(currentTime, statement)
        if (!found) {
          previousStatement = statement
        }
        return found
      })
      if (currentStatement && previousStatement) {
        if (currentTime - currentStatement.startTime > 2) {
          return currentStatement.startTime
        } else {
          return previousStatement.startTime
        }
      } else if (previousStatement) {
        return previousStatement.startTime
      }
    }
  }

  private skipForwardDelegate = (currentTime: number): number | void => {
    if (this.props.statements) {
      this.checkSpeedSkip()
      let foundCurrentStatement = false
      const nextStatement = this.props.statements.find(statement => {
        const done = foundCurrentStatement
        foundCurrentStatement =
          timeDuringStatement(currentTime, statement) || timeBeforeStatement(currentTime, statement)
        return done
      })
      if (nextStatement) {
        return nextStatement.startTime
      }
    }
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
