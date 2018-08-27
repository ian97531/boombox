import * as React from 'react'
import './PlayerBar.css'

interface IPlayerBarProps {
  duration: number
  currentTime: number
  onSeek: any
}

export default class PlayerBar extends React.Component<IPlayerBarProps> {
  public render() {
    const width = this.props.duration
      ? `${(this.props.currentTime / this.props.duration) * 100}%`
      : '0'
    return (
      <div className="PlayerBar" onClick={this.onClick}>
        <div className="PlayerBar__progress" style={{ width }} />
      </div>
    )
  }

  private onClick = (evt: React.MouseEvent<HTMLDivElement>) => {
    const { width, left } = (evt.currentTarget as HTMLElement).getBoundingClientRect()
    this.props.onSeek((this.props.duration * (evt.pageX - left)) / width)
  }
}
