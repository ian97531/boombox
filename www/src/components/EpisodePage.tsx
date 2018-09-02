import { IEpisode } from '@boombox/shared/types/models'
import ConversationPanel from 'components/ConversationPanel'
import EpisodeMetadataPanel from 'components/EpisodeMetadataPanel'
import Player from 'components/player/Player'
import * as React from 'react'
import { connect } from 'react-redux'
import { RouteComponentProps, withRouter } from 'react-router'
import { Dispatch } from 'redux'
import { getEpisodes } from 'store/actions/episodes'
import { IEpisodesStore } from 'store/reducers/episodes'
import AudioController from 'utilities/AudioController'
import './EpisodePage.css'

interface IEpisodeRouterProps {
  episodeId: string
}

interface IEpisodePageRouterProps extends RouteComponentProps<IEpisodeRouterProps> {}

interface IEpisodePageProps extends IEpisodePageRouterProps {
  episode: IEpisode
  dispatch: Dispatch
}

class EpisodePage extends React.Component<IEpisodePageProps> {
  public componentDidMount() {
    // TODO(ndrwhr): Fetch the audio for the correct episode.
    const DEFAULT_AUDIO_URL = '/audio/test-45.mp3'
    AudioController.setSrc(DEFAULT_AUDIO_URL)

    // HACK(ndrwhr): Fetch the episode if it's not found, this will cause in infinite fetching
    // loop if the id is never found.
    if (!this.props.episode) {
      this.props.dispatch(getEpisodes())
    }
  }

  public render() {
    return (
      <div className="EpisodePage">
        <div className="EpisodePage__left-panel">
          <EpisodeMetadataPanel episode={this.props.episode} />
        </div>
        <div className="EpisodePage__right-panel">
          <div className="EpisodePage__conversation">
            <ConversationPanel />
          </div>
          <div className="EpisodePage__player">
            <Player />
          </div>
        </div>
      </div>
    )
  }
}

const mapStateToProps = (
  { episodes }: { episodes: IEpisodesStore },
  ownProps: IEpisodePageRouterProps
) => ({
  // TODO(ndrwhr): Add error handling case (i.e. if the episode id isn't in the episodes store).
  episode: episodes.episodes[ownProps.match.params.episodeId],
})

export default withRouter(connect(mapStateToProps)(EpisodePage))
