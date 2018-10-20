import { IStatement } from '@boombox/shared/src/types/models/transcript'
import * as React from 'react'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'
import { formatTimeMarker } from 'utilities/Time'
import './Statement.css'

interface IStatementProps {
  audioTime?: number
  dispatch: Dispatch
  isActive: boolean
  isPast: boolean
  onClick: (statement: IStatement) => void
  statement: IStatement
}

class Statement extends React.Component<IStatementProps> {
  public render() {
    const formattedTime = formatTimeMarker(this.props.statement.startTime)

    return (
      <div className="Statement">
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
            {this.props.statement.words.map((word, index) => word.content.toLowerCase()).join(' ')}
          </div>
        </div>
      </div>
    )
  }

  private onClick = (evt: React.MouseEvent<HTMLDivElement>) => {
    this.props.onClick(this.props.statement)
  }
}

export default connect()(Statement)
