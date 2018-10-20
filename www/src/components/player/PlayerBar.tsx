import { IWindowContext } from 'components/WindowEvents'
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
  scrollScrub: boolean
  windowEvents: IWindowContext
}

function timeToWidthPercent(time: number, duration: number) {
  return duration ? `${(time / duration) * 100}%` : '0'
}

class PlayerBar extends React.Component<IPlayerBarProps> {
  public componentDidMount() {
    this.props.windowEvents.addUserScrollListener(this.scrollEvent)
  }

  public componentWillUnmount() {
    this.props.windowEvents.removeUserScrollListener(this.scrollEvent)
  }

  public render() {
    const currentScrubTimeWidth =
      this.props.currentScrubTime !== null
        ? timeToWidthPercent(this.props.currentScrubTime, this.props.duration)
        : '0'
    const currentTimeWidth = timeToWidthPercent(this.props.currentTime, this.props.duration)
    const playerBarStyle: any = {}
    const scrubStyle: any = { width: currentScrubTimeWidth }
    if (this.props.scrollScrub) {
      playerBarStyle.transform = 'translateY(-50%) scaleY(2)'
      scrubStyle.opacity = 1
    }
    return (
      <div
        className="PlayerBar"
        onClick={this.onClick}
        onMouseMove={this.onMouseMove}
        onMouseLeave={this.onMouseLeave}
        style={playerBarStyle}
      >
        <div
          className="PlayerBar__progress PlayerBar__progress--current"
          style={{ width: currentTimeWidth }}
        />
        <div className="PlayerBar__progress PlayerBar__progress--scrub" style={scrubStyle} />
        <div className="PlayerBar__progress PlayerBar__progress--inactive" />
      </div>
    )
  }

  private scrollEvent = (position: number, scrollHeight: number) => {
    if (this.props.scrollScrub) {
      this.props.changeCurrentScrubTime(this.props.duration * (position / scrollHeight))
    }
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
