import PlayerBar from 'components/player/PlayerBar'
import * as React from 'react'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'
import { playerCurrentTimeSeek, playerPause, playerPlay } from 'store/actions/player'
import { IPlayerStore } from 'store/reducers/player'
import { AudioControllerStatus } from 'utilities/AudioController'
import './Player.css'

interface IPlayerProps extends IPlayerStore {
  dispatch: Dispatch
}

class Player extends React.Component<IPlayerProps> {
  public render() {
    const buttonText = this.props.status === AudioControllerStatus.Playing ? 'Pause' : 'Play'
    return (
      <div className="Player">
        <div className="Player__controls">
          <button
            disabled={this.props.status === AudioControllerStatus.Loading}
            onClick={this.onPlayButtonClick}
          >
            {buttonText}
          </button>
        </div>
        <div className="Player__bar-wrapper">
          <PlayerBar
            currentTime={this.props.currentTime}
            duration={this.props.duration}
            onSeek={this.onSeek}
          />
        </div>
      </div>
    )
  }

  private onSeek = (newCurrentTime: number) => {
    this.props.dispatch(playerCurrentTimeSeek(newCurrentTime))
  }

  private onPlayButtonClick = () => {
    if (this.props.status === AudioControllerStatus.Playing) {
      this.props.dispatch(playerPause())
    } else {
      this.props.dispatch(playerPlay())
    }
  }
}

function mapStateToProps({ player }: { player: IPlayerStore }) {
  return player
}

export default connect(mapStateToProps)(Player)
