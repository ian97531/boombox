import * as React from 'react'
import { connect } from 'react-redux'
import { Link } from 'react-router-dom'
import { Dispatch } from 'redux'
import { getEpisodes } from 'store/actions/episodes'
import { IEpisodesStore } from 'store/reducers/episodes'

interface IEpisodeListPageProps {
  episodes: IEpisodesStore
  dispatch: Dispatch
}

class EpisodeListPage extends React.Component<IEpisodeListPageProps> {
  public componentDidMount() {
    this.props.dispatch(getEpisodes())
  }
  public render() {
    const { pending, episodeIds, episodes } = this.props.episodes
    return (
      <div className="EpisodeListPage">
        {pending ? 'Loading Episodes...' : ''}
        {episodeIds.map((episodeId: string) => {
          return (
            <Link key={episodeId} to={`episode/${episodeId}`}>
              {episodes[episodeId].title}
            </Link>
          )
        })}
      </div>
    )
  }
}

const mapStateToProps = ({ episodes }: { episodes: IEpisodesStore }) => ({
  episodes,
})

export default connect(mapStateToProps)(EpisodeListPage)
