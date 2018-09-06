import { IEpisode } from '@boombox/shared/types/models'
import * as React from 'react'
import { connect } from 'react-redux'
import { Link } from 'react-router-dom'
import { Dispatch } from 'redux'
import { getEpisodes } from 'store/actions/episodes'
import { IEpisodesStore } from 'store/reducers/episodes'
import './EpisodeListPage.css'

interface IEpisodeListPageProps {
  episodes: IEpisodesStore
  dispatch: Dispatch
}

const EpisodeEntry: React.SFC<{ episode: IEpisode }> = ({ episode }: { episode: IEpisode }) => (
  <li className="EpisodeListPage__entry">
    <h4 className="EpisodeListPage__entry-heading">
      <Link className="EpisodeListPage__entry-heading-link" to={`episode/${episode.episodeId}`}>
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
    const { pending, episodeIds, episodes } = this.props.episodes
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
            {episodeIds.map((episodeId: string) => (
              <EpisodeEntry key={episodeId} episode={episodes[episodeId]} />
            ))}
          </ol>
        </div>
      </div>
    )
  }
}

const mapStateToProps = ({ episodes }: { episodes: IEpisodesStore }) => ({
  episodes,
})

export default connect(mapStateToProps)(EpisodeListPage)
