import { IStatement } from '@boombox/shared/types/models'
import classNames from 'classnames'
import * as React from 'react'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'
import { playerCurrentTimeSeek } from 'store/actions/player'
import { IPlayerStore } from 'store/reducers/player'
import { formatTimeMarker } from 'utilities/Time'
import './Statement.css'

interface IStatementProps extends IStatement {
  isActive: boolean
  changeCurrentTime: (newCurrentTime: number) => void
}

class Statement extends React.Component<IStatementProps> {
  public render() {
    const formatedTime = formatTimeMarker(this.props.startTime)
    return (
      <div
        className={classNames('Statement', {
          'Statement--active': this.props.isActive,
        })}
      >
        <div className="Statement__speaker">
          <div className="Statement__speaker-name">{this.props.speaker.name}</div>
          <div
            className="Statement__speaker-time"
            onClick={this.onClick}
            title={`Jump to ${formatedTime}`}
          >
            {formatedTime}
          </div>
        </div>
        <div className="Statement__content-wrapper">
          <div className="Statement__content">
            {this.props.words.map((word, index) => word.content.toLowerCase()).join(' ')}
          </div>
        </div>
      </div>
    )
  }

  private onClick = (evt: React.MouseEvent<HTMLDivElement>) => {
    this.props.changeCurrentTime(this.props.startTime)
  }
}

const mapStateToProps = ({ player }: { player: IPlayerStore }, ownProps: IStatement) => {
  const currentTime = player.currentTime
  const words = ownProps.words
  return {
    isActive: currentTime >= words[0].startTime && currentTime <= words[words.length - 1].endTime,
  }
}

const mapDispatchToProps = (dispatch: Dispatch) => ({
  changeCurrentTime(newCurrentTime: number) {
    dispatch(playerCurrentTimeSeek(newCurrentTime))
  },
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Statement)
