import PlayerBar from 'components/player/PlayerBar'
import * as React from 'react'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'
import { playerCurrentTimeSeek } from 'store/actions/player'
import { IPlayerStore, PlayerStatus } from 'store/reducers/player'
import './Player.css'

const STATUS_TEXT = {
  [PlayerStatus.Idle]: 'Idle',
  [PlayerStatus.Loading]: 'Loading',
  [PlayerStatus.Error]: 'Error',
  [PlayerStatus.Playing]: 'Playing',
}

interface IPlayerProps extends IPlayerStore {
  dispatch: Dispatch
}

class Player extends React.Component<IPlayerProps> {
  constructor(props: IPlayerProps) {
    super(props)
    this.onSeek = this.onSeek.bind(this)
  }

  public render() {
    return (
      <div className="Player">
        <PlayerBar
          currentTime={this.props.currentTime}
          duration={this.props.duration}
          onSeek={this.onSeek}
        />
        <div className="Player__controls">{STATUS_TEXT[this.props.status]}</div>
      </div>
    )
  }

  private onSeek(newCurrentTime: number) {
    this.props.dispatch(playerCurrentTimeSeek(newCurrentTime))
  }
}

function mapStateToProps({ player }: { player: IPlayerStore }) {
  return player
}

export default connect(mapStateToProps)(Player)
