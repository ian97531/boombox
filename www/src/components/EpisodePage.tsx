import { IEpisode } from '@boombox/shared/src/types/models'
import ConversationPanel from 'components/ConversationPanel'
import EpisodeMetadataPanel from 'components/EpisodeMetadataPanel'
import Player from 'components/player/Player'
import * as React from 'react'
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
    let epidsodeConversationPanel: any = ''
    let episodeMetadataPanel: any = ''
    let player: any = ''

    if (this.props.episode) {
      epidsodeConversationPanel = (
        <ConversationPanel
          requestedEpisodeSlug={this.props.episode.slug}
          requestedPodcastSlug={this.props.episode.podcastSlug}
        />
      )
      episodeMetadataPanel = <EpisodeMetadataPanel episode={this.props.episode} />
      player = <Player audioUrl={this.props.episode.mp3URL} />
    }

    return (
      <div className="EpisodePage">
        <div className="EpisodePage__left-panel">{episodeMetadataPanel}</div>
        <div className="EpisodePage__right-panel">
          <div className="EpisodePage__player">{player}</div>
          <div className="EpisodePage__conversation">{epidsodeConversationPanel}</div>
        </div>
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
