import * as React from 'react'
import { formatTimeMarker } from 'utilities/Time'
import './PlayerTimer.css'

interface IPlayerTimerProps {
  currentTime: number
  duration: number
}

const PlayerTimer = (props: IPlayerTimerProps) => (
  <div className="PlayerTimer">
    {formatTimeMarker(props.currentTime)} / {formatTimeMarker(props.duration)}
  </div>
)

export default PlayerTimer
