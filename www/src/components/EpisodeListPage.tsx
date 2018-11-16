import { IEpisode, IPodcast } from '@boombox/shared'
import { EpisodeEntry } from 'components/EpisodeEntry'
import * as React from 'react'
import { connect } from 'react-redux'
import { RouteComponentProps, withRouter } from 'react-router'
import { Dispatch } from 'redux'
import { getEpisodes } from 'store/actions/episodes'
import { getPodcast } from 'store/actions/podcasts'
import { IEpisodesStore } from 'store/reducers/episodes'
import { IPodcastsStore } from 'store/reducers/podcasts'

import './EpisodeListPage.css'

interface IEpisodeListRouterProps {
  podcastSlug: string
}

interface IEpisodeListPageRouterProps extends RouteComponentProps<IEpisodeListRouterProps> {}

interface IEpisodeListPageProps extends IEpisodeListPageRouterProps {
  podcast: IPodcast
  episodes: { [id: string]: IEpisode }
  dispatch: Dispatch
  pending: boolean
  podcastSlug: string
}

class EpisodeListPage extends React.Component<IEpisodeListPageProps> {
  public componentDidMount() {
    this.props.dispatch(getPodcast({ podcastSlug: this.props.podcastSlug }))
    this.props.dispatch(getEpisodes({ podcastSlug: this.props.podcastSlug }))
  }
  public render() {
    const { episodes, pending } = this.props

    let podcastImage: any = ''
    let podcastTitle = ''
    let podcastSummary = ''

    if (this.props.podcast) {
      podcastImage = (
        <img className="EpisodeListPage__sidebar-img" src={this.props.podcast.imageURL} />
      )
      podcastTitle = this.props.podcast.title
      podcastSummary = this.props.podcast.summary
    }
    return (
      <div className="EpisodeListPage">
        <div className="EpisodeListPage__sidebar">
          {podcastImage}
          <h2 className="EpisodeListPage__sidebar-heading">{podcastTitle}</h2>
          <p className="EpisodeListPage__sidebar-summary">{podcastSummary}</p>
        </div>
        <div className="EpisodeListPage__content">
          {pending ? 'Loading Episodes...' : ''}
          <ol className="EpisodeListPage__entry-list">
            {Object.keys(episodes).map((episodeSlug: string) => (
              <EpisodeEntry key={episodeSlug} episode={episodes[episodeSlug]} />
            ))}
          </ol>
        </div>
      </div>
    )
  }
}

const mapStateToProps = (
  { episodes, podcasts }: { episodes: IEpisodesStore; podcasts: IPodcastsStore },
  ownProps: IEpisodeListPageRouterProps
) => {
  // TODO(ndrwhr): Add error handling case (i.e. if the podcast isn't in the episodes store).
  const podcastSlug = ownProps.match.params.podcastSlug
  return {
    episodes: episodes.episodes[podcastSlug] || {},
    pending: episodes.pending,
    podcast: podcasts.podcasts[podcastSlug] || {},
    podcastSlug,
  }
}

export default withRouter(connect(mapStateToProps)(EpisodeListPage))
