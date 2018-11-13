import * as React from 'react'
import './PlayerBar.css'

interface IPlayerBarProps {
  audioProgressPercent: number
  loadingProgressPercent: number
  scrubProgressPercent?: number
  onClick?: (percent: number) => void
  onScrub?: (percent: number) => void
  onScrubEnd?: () => void
}

class PlayerBar extends React.Component<IPlayerBarProps> {
  public render() {
    const scrubProgress = this.props.scrubProgressPercent
      ? this.props.scrubProgressPercent * 100
      : undefined
    const loadProgress = this.props.loadingProgressPercent
      ? this.props.loadingProgressPercent * 100
      : undefined
    const audioProgress = this.props.audioProgressPercent * 100
    const scrubbing = this.props.scrubProgressPercent !== undefined
    const loading = this.props.loadingProgressPercent !== 0
    const playerBarStyle: React.CSSProperties = {
      transform: scrubbing ? 'translateY(-50%) scaleY(2)' : undefined,
    }
    const scrubStyle: React.CSSProperties = {
      opacity: scrubbing ? 1 : undefined,
      width: `${scrubProgress || 0}%`,
    }

    const loadingStyle: React.CSSProperties = {
      opacity: loading ? 0.05 : undefined,
      width: `${loadProgress || 0}%`,
    }
    return (
      <div
        className="PlayerBar"
        onClick={this.onClick}
        onMouseMove={this.onMouseMove}
        onMouseLeave={this.onMouseLeave}
        style={playerBarStyle}
      >
        <div className="PlayerBar__progress PlayerBar__progress--loading" style={loadingStyle} />
        <div
          className="PlayerBar__progress PlayerBar__progress--current"
          style={{ width: `${audioProgress}%` }}
        />

        <div className="PlayerBar__progress PlayerBar__progress--scrub" style={scrubStyle} />
        <div className="PlayerBar__progress PlayerBar__progress--inactive" />
      </div>
    )
  }

  private mouseEventToPercent(evt: React.MouseEvent<HTMLDivElement>) {
    const { width, left } = (evt.currentTarget as HTMLElement).getBoundingClientRect()
    const percent = (evt.pageX - left) / width

    return percent <= this.props.loadingProgressPercent
      ? percent
      : this.props.loadingProgressPercent
  }

  private onClick = (evt: React.MouseEvent<HTMLDivElement>) => {
    if (this.props.onClick) {
      this.props.onClick(this.mouseEventToPercent(evt))
    }
  }

  private onMouseMove = (evt: React.MouseEvent<HTMLDivElement>) => {
    if (this.props.onScrub) {
      this.props.onScrub(this.mouseEventToPercent(evt))
    }
  }

  private onMouseLeave = (evt: React.MouseEvent<HTMLDivElement>) => {
    if (this.props.onScrubEnd) {
      this.props.onScrubEnd()
    }
  }
}

export default PlayerBar
