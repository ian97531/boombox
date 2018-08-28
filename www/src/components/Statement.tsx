import { IStatement } from '@boombox/shared/types/models'
import * as React from 'react'

import { formatTime } from '../utilities/Time'

import './Statement.css'

const Statement: React.SFC<IStatement> = props => (
  <div className="Statement">
    <div className="Statement__speaker">
      <div className="Statement__name">{props.speaker.name}</div>
      <div className="Statement__start-time">
        <span className="Statement__start-time-bottom">{formatTime(props.startTime)}</span>
      </div>
    </div>
    <div className="Statement__content">
      {props.words.map((word, index) => word.content.toLowerCase()).join(' ')}
    </div>
  </div>
)

export default Statement
