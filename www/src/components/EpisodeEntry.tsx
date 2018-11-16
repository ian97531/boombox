import * as React from 'react'
import { Link } from 'react-router-dom'

import { IEpisode } from '@boombox/shared'
import { formatDate, formatDuration, formatTime } from 'utilities/Time'

export class EpisodeEntry extends React.Component<{ episode: IEpisode }> {
  public render() {
    const episode = this.props.episode
    const dummyEl = document.createElement('span')
    dummyEl.innerHTML = episode.summary
    const summary = dummyEl.textContent ? dummyEl.textContent.split('\n')[0] : ''
    return (
      <li className="EpisodeListPage__entry">
        <h4 className="EpisodeListPage__entry-heading">
          <Link
            className="EpisodeListPage__entry-heading-link"
            to={`/podcasts/${episode.podcastSlug}/${episode.slug}`}
          >
            {episode.title}
          </Link>
        </h4>
        <p className="EpisodeListPage__entry-meta">
          {formatDate(episode.publishedAt)} at {formatTime(episode.publishedAt)} |{' '}
          {formatDuration(episode.duration)}
        </p>
        <div className="EpisodeListPage__entry-summary">{summary}</div>
      </li>
    )
  }
}
