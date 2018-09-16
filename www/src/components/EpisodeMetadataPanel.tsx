import { IEpisode } from '@boombox/shared/src/types/models'
import * as React from 'react'
import { formatDate, formatDuration, formatTime } from 'utilities/Time'

import './EpisodeMetadataPanel.css'

interface IEpisodeMetadataPanelProps {
  episode: IEpisode
}

const Heading: React.SFC = (props: { children: React.ReactNode }) => (
  <h2 className="EpisodeMetadataPanel__heading">{props.children}</h2>
)

const Subtext: React.SFC = (props: { children: React.ReactNode }) => (
  <p className="EpisodeMetadataPanel__subtext">{props.children}</p>
)

const EpisodeMetadataPanel: React.SFC<IEpisodeMetadataPanelProps> = ({
  episode,
}: IEpisodeMetadataPanelProps) => (
  <div className="EpisodeMetadataPanel">
    {!episode ? (
      'Waiting for episodes to load'
    ) : (
      <React.Fragment>
        <Heading>{episode.title}</Heading>
        <div
          dangerouslySetInnerHTML={{ __html: episode.summary }}
          className="EpisodeMetadataPanel__subtext"
        />

        <Heading>Duration</Heading>
        <Subtext>{formatDuration(episode.duration)}</Subtext>

        <Heading>Publish Date</Heading>
        <Subtext>
          {formatDate(episode.publishedAt)} at {formatTime(episode.publishedAt)}
        </Subtext>
      </React.Fragment>
    )}
  </div>
)

export default EpisodeMetadataPanel
