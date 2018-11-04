import { IStatement } from '@boombox/shared/src/types/models/transcript'
import classNames from 'classnames'
import * as React from 'react'
import { formatTimeMarker } from 'utilities/Time'
import './Statement.css'
import Words from './Words'

interface IStatementProps {
  audioTime?: number
  isActive: boolean
  isPast: boolean
  onClick: (statement: IStatement) => void
  statement: IStatement
}

class Statement extends React.Component<IStatementProps> {
  public render() {
    const formattedTime = formatTimeMarker(this.props.statement.startTime)

    return (
      <div
        className={classNames('Statement', {
          'Statement--active': this.props.isActive,
          'Statement--past': this.props.isPast,
        })}
      >
        <div className="Statement__speaker">
          <div className="Statement__speaker-name">{this.props.statement.speaker.name}</div>
          <div
            className="Statement__speaker-time"
            onClick={this.onClick}
            title={`Jump to ${formattedTime}`}
          >
            {formattedTime}
          </div>
        </div>
        <div className="Statement__content-wrapper">
          <div className="Statement__content">
            <Words isActive={this.props.isActive} words={this.props.statement.words} />
          </div>
        </div>
      </div>
    )
  }

  private onClick = (evt: React.MouseEvent<HTMLDivElement>) => {
    this.props.onClick(this.props.statement)
  }
}

export default Statement
