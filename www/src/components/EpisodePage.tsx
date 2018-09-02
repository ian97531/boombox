import ConversationPanel from 'components/ConversationPanel'
import EpisodeMetadataPanel from 'components/EpisodeMetadataPanel'
import Player from 'components/player/Player'
import * as React from 'react'
import AudioController from 'utilities/AudioController'
import './EpisodePage.css'

class EpisodePage extends React.Component {
  public componentDidMount() {
    // TODO(ndrwhr): Fetch the audio for the correct episode.
    const DEFAULT_AUDIO_URL = '/audio/test-45.mp3'
    AudioController.setSrc(DEFAULT_AUDIO_URL)
  }

  public render() {
    return (
      <div className="EpisodePage">
        <div className="EpisodePage__left-panel">
          <EpisodeMetadataPanel />
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

export default EpisodePage
