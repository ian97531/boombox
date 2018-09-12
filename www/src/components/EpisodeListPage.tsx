import { IEpisode } from '@boombox/shared/types/models'
import * as React from 'react'
import { connect } from 'react-redux'
import { RouteComponentProps, withRouter } from 'react-router'
import { Link } from 'react-router-dom'
import { Dispatch } from 'redux'
import { getEpisodes } from 'store/actions/episodes'
import { IEpisodesStore } from 'store/reducers/episodes'
import './EpisodeListPage.css'

interface IEpisodeListRouterProps {
  podcastSlug: string
}

interface IEpisodeListPageRouterProps extends RouteComponentProps<IEpisodeListRouterProps> {}

interface IEpisodeListPageProps extends IEpisodeListPageRouterProps {
  episodes: { [id: string]: IEpisode }
  dispatch: Dispatch
  pending: boolean
}

const EpisodeEntry: React.SFC<{ episode: IEpisode }> = ({ episode }: { episode: IEpisode }) => (
  <li className="EpisodeListPage__entry">
    <h4 className="EpisodeListPage__entry-heading">
      <Link
        className="EpisodeListPage__entry-heading-link"
        to={`/podcast/${episode.podcastSlug}/${episode.slug}`}
      >
        {episode.title}
      </Link>
    </h4>
    <p className="EpisodeListPage__entry-meta">
      {episode.publishedAt} | {episode.duration}
    </p>
    <p className="EpisodeListPage__entry-summary">{episode.summary}</p>
  </li>
)

class EpisodeListPage extends React.Component<IEpisodeListPageProps> {
  public componentDidMount() {
    this.props.dispatch(getEpisodes())
  }
  public render() {
    const { episodes, pending } = this.props

    return (
      <div className="EpisodeListPage">
        <div className="EpisodeListPage__sidebar">
          <img className="EpisodeListPage__sidebar-img" src="https://via.placeholder.com/350x350" />
          <h2 className="EpisodeListPage__sidebar-heading">Hello Internet</h2>
          <p className="EpisodeListPage__sidebar-summary">
            Conversations between CGP Grey and Brady Haran.
          </p>
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
  { episodes }: { episodes: IEpisodesStore },
  ownProps: IEpisodeListPageRouterProps
) => {
  // TODO(ndrwhr): Add error handling case (i.e. if the podcast isn't in the episodes store).
  return {
    episodes: episodes.episodes[ownProps.match.params.podcastSlug] || {},
    pending: episodes.pending,
  }
}

export default withRouter(connect(mapStateToProps)(EpisodeListPage))
