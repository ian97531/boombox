import { IEpisode } from '@boombox/shared/types/models'
import * as React from 'react'
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
        <Subtext>{episode.summary}</Subtext>

        <Heading>Duration</Heading>
        <Subtext>{episode.duration}</Subtext>

        <Heading>Publish Date</Heading>
        <Subtext>{episode.publishedAt}</Subtext>
      </React.Fragment>
    )}
  </div>
)

export default EpisodeMetadataPanel
