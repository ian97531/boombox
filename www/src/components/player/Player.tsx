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

type ISkipDelegate = (currentTime: number) => number | void

interface IPlayerProps extends IPlayerStore {
  audioDuration: number
  audioUrl: string
  dispatch: Dispatch
  onSeek: (time: number) => void
  scrubProgressPercent: number | undefined
  skipBackDelegate?: ISkipDelegate
  skipForwardDelegate?: ISkipDelegate
}

interface IPlayerState {
  scrubProgressPercent?: number
}

class Player extends React.Component<IPlayerProps, IPlayerState> {
  public readonly state: IPlayerState = {}

  public componentDidMount() {
    AudioController.setAudio(this.props.audioUrl, this.props.audioDuration)
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
            loadingProgressPercent={this.props.loadingProgress}
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
    const time = percentage * this.props.duration
    this.props.dispatch(playerCurrentTimeSeek(time))
    this.props.onSeek(time)
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
    if (this.props.status === AudioControllerStatus.Playing && this.props.skipBackDelegate) {
      const skipBackTime = this.props.skipBackDelegate(this.props.currentTime)
      if (skipBackTime) {
        const percent = (skipBackTime / this.props.duration) * this.props.duration
        this.props.dispatch(playerCurrentTimeSeek(percent))
      }
    }
  }

  private onForwardButtonClick = () => {
    if (this.props.status === AudioControllerStatus.Playing && this.props.skipForwardDelegate) {
      const skipForwardTime = this.props.skipForwardDelegate(this.props.currentTime)
      if (skipForwardTime) {
        const percent = (skipForwardTime / this.props.duration) * this.props.duration
        this.props.dispatch(playerCurrentTimeSeek(percent))
      }
    }
  }
}

function mapStateToProps({ player }: { player: IPlayerStore }) {
  return player
}

export default connect(mapStateToProps)(Player)
