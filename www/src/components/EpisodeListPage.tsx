import * as React from 'react'
import { Link } from 'react-router-dom'

const EpisodeListPage: React.SFC = () => (
  <div className="EpisodeListPage">
    <Link to="episode/some-episode-id">H.I. #106: Water on Mars</Link>
  </div>
)

export default EpisodeListPage
