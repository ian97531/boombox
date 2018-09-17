import PlayerBar from 'components/player/PlayerBar'
import Sprite from 'components/utilities/Sprite'
import * as React from 'react'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'
import { playerPause, playerPlay } from 'store/actions/player'
import { IPlayerStore } from 'store/reducers/player'
import { AudioControllerStatus, default as AudioController } from 'utilities/AudioController'
import './Player.css'

interface IPlayerProps extends IPlayerStore {
  audioUrl: string
  dispatch: Dispatch
}

class Player extends React.Component<IPlayerProps> {
  public componentWillMount() {
    AudioController.setSrc(this.props.audioUrl)
  }
  public render() {
    const playPauseId = this.props.status === AudioControllerStatus.Playing ? 'pause' : 'play'
    return (
      <div className="Player">
        <div className="Player__controls">
          <button
            className="Player__controls-button Player__controls-button--small"
            disabled={this.props.status === AudioControllerStatus.Loading}
            onClick={this.onBackButtonClick}
          >
            B
          </button>
          <button
            className="Player__controls-button"
            disabled={this.props.status === AudioControllerStatus.Loading}
            onClick={this.onPlayButtonClick}
          >
            <Sprite id={playPauseId} className="Player__control-button-icon" />
          </button>
          <button
            className="Player__controls-button Player__controls-button--small"
            disabled={this.props.status === AudioControllerStatus.Loading}
            onClick={this.onForwardButtonClick}
          >
            F
          </button>
        </div>
        <div className="Player__bar-wrapper">
          <PlayerBar />
        </div>
      </div>
    )
  }

  private onPlayButtonClick = () => {
    if (this.props.status === AudioControllerStatus.Playing) {
      this.props.dispatch(playerPause())
    } else {
      this.props.dispatch(playerPlay())
    }
  }

  private onBackButtonClick = () => {
    // Dispatch a move back a statement action.
  }

  private onForwardButtonClick = () => {
    // Dispatch a move forward a statement action.
  }
}

function mapStateToProps({ player }: { player: IPlayerStore }) {
  return player
}

export default connect(mapStateToProps)(Player)
