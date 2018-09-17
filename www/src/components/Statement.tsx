import { IStatement } from '@boombox/shared/types/models'
import * as React from 'react'

import { formatTimeMarker } from '../utilities/Time'

import './Statement.css'

const Statement: React.SFC<IStatement> = props => (
  <div className="Statement">
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

export default Statement
