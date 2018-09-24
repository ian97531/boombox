import * as React from 'react'
import { connect } from 'react-redux'
import { IPlayerStore } from 'store/reducers/player'
import { formatTimeMarker } from 'utilities/Time'
import './PlayerTimer.css'

const PlayerTimer = (props: { currentTime: number; duration: number }) => (
  <div className="PlayerTimer">
    {formatTimeMarker(props.currentTime)} / {formatTimeMarker(props.duration)}
  </div>
)

const mapStateToProps = ({ player }: { player: IPlayerStore }) => ({
  currentTime: Math.floor(player.currentTime || 0),
  duration: Math.floor(player.duration || 0),
})

export default connect(mapStateToProps)(PlayerTimer)
