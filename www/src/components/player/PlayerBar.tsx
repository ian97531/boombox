import * as React from 'react';

interface IPlayerBarProps {
  duration: number;
  currentTime: number;
  onSeek: any;
}

export default class PlayerBar extends React.Component<IPlayerBarProps> {
  constructor(props: IPlayerBarProps) {
    super(props);

    this.onClick = this.onClick.bind(this);
  }

  public render() {
    const width = this.props.duration
      ? `${(this.props.currentTime / this.props.duration) * 100}%`
      : '0';
    return (
      <div className="Player__player-bar" onClick={this.onClick}>
        <div className="Player__player-bar-progress" style={{ width }} />
      </div>
    );
  }

  private onClick(evt: React.MouseEvent<HTMLDivElement>) {
    const {
      width,
      left,
    } = (evt.currentTarget as HTMLElement).getBoundingClientRect();
    this.props.onSeek((this.props.duration * (evt.pageX - left)) / width);
  }
}
