import PlayerBar from 'components/player/PlayerBar'
import PlayerTimer from 'components/player/PlayerTimer'
import Sprite from 'components/utilities/Sprite'
import * as React from 'react'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'
import { playerCurrentTimeSeek, playerPause, playerPlay } from 'store/actions/player'
import { IPlayerStore } from 'store/reducers/player'
import { AudioControllerStatus, default as AudioController } from 'utilities/AudioController'
import './Player.css'

interface IPlayerProps extends IPlayerStore {
  audioUrl: string
  dispatch: Dispatch
  onSeek: (time: number) => void
  scrubProgressPercent: number | undefined
}

interface IPlayerState {
  scrubProgressPercent?: number
}

class Player extends React.Component<IPlayerProps, IPlayerState> {
  public readonly state: IPlayerState = {}

  public componentDidMount() {
    AudioController.setSrc(this.props.audioUrl)
  }

  public render() {
    const playPauseId = this.props.status === AudioControllerStatus.Playing ? 'pause' : 'play'
    const scrubProgressPercent = this.state.scrubProgressPercent || this.props.scrubProgressPercent
    const currentTime =
      scrubProgressPercent !== undefined
        ? scrubProgressPercent * this.props.duration
        : this.props.currentTime
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
        <div className="Player__episode-info" />
        <div className="Player__timer-wrapper">
          <PlayerTimer currentTime={currentTime} duration={this.props.duration} />
        </div>
        <div className="Player__bar-wrapper">
          <PlayerBar
            audioProgressPercent={this.props.currentTime / this.props.duration}
            onClick={this.onClick}
            onScrub={this.onScrub}
            onScrubEnd={this.onScrubEnd}
            scrubProgressPercent={scrubProgressPercent}
          />
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

  private onClick = (percentage: number) => {
    this.props.dispatch(playerCurrentTimeSeek(percentage * this.props.duration))
    this.props.onSeek(percentage * this.props.duration)
  }

  private onScrub = (percentage: number) => {
    this.setState({
      scrubProgressPercent: percentage,
    })
  }

  private onScrubEnd = () => {
    this.setState({
      scrubProgressPercent: undefined,
    })
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
