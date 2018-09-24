import { IEpisode } from '@boombox/shared/types/models'
import ConversationPanel from 'components/ConversationPanel'
import Player from 'components/player/Player'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { connect } from 'react-redux'
import { RouteComponentProps, withRouter } from 'react-router'
import { Dispatch } from 'redux'
import { getEpisode } from 'store/actions/episodes'
import { IEpisodesStore } from 'store/reducers/episodes'
import './EpisodePage.css'

interface IEpisodeRouterProps {
  episodeSlug: string
  podcastSlug: string
}

interface IEpisodePageRouterProps extends RouteComponentProps<IEpisodeRouterProps> {}

interface IEpisodePageProps extends IEpisodePageRouterProps {
  episode: IEpisode | undefined
  podcastSlug: string
  episodeSlug: string
  dispatch: Dispatch
}

class EpisodePage extends React.Component<IEpisodePageProps> {
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

    if (this.props.episode) {
      episodeConversationPanel = (
        <ConversationPanel
          requestedEpisodeSlug={this.props.episode.slug}
          requestedPodcastSlug={this.props.episode.podcastSlug}
        />
      )
      // TODO(ndrwhr): This should be rendered in the App so that the user can keep listening
      // to the current podcast while browsing around. To do this we will have to rework the store
      // so that the currently episode information isn't tightly coupled with the router.
      player = ReactDOM.createPortal(
        <Player audioUrl={this.props.episode.mp3URL} />,
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
}

const mapStateToProps = (
  { episodes }: { episodes: IEpisodesStore },
  ownProps: IEpisodePageRouterProps
) => {
  const podcastSlug = ownProps.match.params.podcastSlug
  const episodeSlug = ownProps.match.params.episodeSlug
  const episode = episodes.episodes[podcastSlug]
    ? episodes.episodes[podcastSlug][episodeSlug]
    : undefined

  return {
    // TODO(ndrwhr): Add error handling case (i.e. if the episode id isn't in the episodes store).
    episode,
    episodeSlug,
    podcastSlug,
  }
}

export default withRouter(connect(mapStateToProps)(EpisodePage))
