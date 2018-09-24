import { IStatement } from '@boombox/shared/types/models'
import classNames from 'classnames'
import * as React from 'react'
import { connect } from 'react-redux'
import { IPlayerStore } from 'store/reducers/player'
import { formatTimeMarker } from 'utilities/Time'
import './Statement.css'

interface IStatementProps extends IStatement {
  isActive: boolean
}

const Statement: React.SFC<IStatementProps> = props => (
  <div
    className={classNames('Statement', {
      'Statement--active': props.isActive,
    })}
  >
    <div className="Statement__speaker">
      <div className="Statement__speaker-name">{props.speaker.name}</div>
      <div className="Statement__speaker-time">{formatTimeMarker(props.startTime)}</div>
    </div>
    <div className="Statement__content-wrapper">
      <div className="Statement__content">
        {props.words.map((word, index) => word.content.toLowerCase()).join(' ')}
      </div>
    </div>
  </div>
)

const mapStateToProps = ({ player }: { player: IPlayerStore }, ownProps: IStatement) => {
  const currentTime = player.currentTime
  const words = ownProps.words
  return {
    isActive: currentTime >= words[0].startTime && currentTime <= words[words.length - 1].endTime,
  }
}

export default connect(mapStateToProps)(Statement)
