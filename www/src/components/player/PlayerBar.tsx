import * as React from 'react'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'
import {
  playerCurrentScrubTimeClear,
  playerCurrentScrubTimeSet,
  playerCurrentTimeSeek,
} from 'store/actions/player'
import { IPlayerStore } from 'store/reducers/player'
import './PlayerBar.css'

interface IPlayerBarProps {
  changeCurrentScrubTime: (newCurrentScrubTime: number) => void
  changeCurrentTime: (newCurrentTime: number) => void
  clearCurrentScrubTime: () => void
  currentScrubTime: number | null
  currentTime: number
  duration: number
}

function timeToWidthPercent(time: number, duration: number) {
  return duration ? `${(time / duration) * 100}%` : '0'
}

class PlayerBar extends React.Component<IPlayerBarProps> {
  public render() {
    const currentScrubTimeWidth =
      this.props.currentScrubTime !== null
        ? timeToWidthPercent(this.props.currentScrubTime, this.props.duration)
        : '0'
    const currentTimeWidth = timeToWidthPercent(this.props.currentTime, this.props.duration)

    return (
      <div
        className="PlayerBar"
        onClick={this.onClick}
        onMouseMove={this.onMouseMove}
        onMouseLeave={this.onMouseLeave}
      >
        <div className="PlayerBar__progress" style={{ width: currentTimeWidth }} />
        <div
          className="PlayerBar__progress PlayerBar__progress--active"
          style={{ width: currentScrubTimeWidth }}
        />
      </div>
    )
  }

  private mouseEventToTime(evt: React.MouseEvent<HTMLDivElement>) {
    const { width, left } = (evt.currentTarget as HTMLElement).getBoundingClientRect()
    const time = (this.props.duration * (evt.pageX - left)) / width
    return time
  }

  private onClick = (evt: React.MouseEvent<HTMLDivElement>) => {
    this.props.changeCurrentTime(this.mouseEventToTime(evt))
  }

  private onMouseMove = (evt: React.MouseEvent<HTMLDivElement>) => {
    this.props.changeCurrentScrubTime(this.mouseEventToTime(evt))
  }

  private onMouseLeave = () => {
    this.props.clearCurrentScrubTime()
  }
}

const mapStateToProps = ({ player }: { player: IPlayerStore }) => ({
  currentScrubTime: player.currentScrubTime,
  currentTime: player.currentTime,
  duration: player.duration,
})

const mapDispatchToProps = (dispatch: Dispatch) => ({
  changeCurrentTime(newCurrentTime: number) {
    dispatch(playerCurrentTimeSeek(newCurrentTime))
  },
  changeCurrentScrubTime(newCurrentScrubTime: number) {
    dispatch(playerCurrentScrubTimeSet(newCurrentScrubTime))
  },
  clearCurrentScrubTime() {
    dispatch(playerCurrentScrubTimeClear())
  },
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(PlayerBar)
