import * as React from 'react'
import './EpisodeMetadataPanel.css'

const Heading: React.SFC = (props: { children: React.ReactNode }) => (
  <h2 className="EpisodeMetadataPanel__heading">{props.children}</h2>
)

const Subtext: React.SFC = (props: { children: React.ReactNode }) => (
  <p className="EpisodeMetadataPanel__subtext">{props.children}</p>
)

const EpisodeMetadataPanel: React.SFC = () => (
  <div className="EpisodeMetadataPanel">
    <Heading>H.I. #106: Water on Mars</Heading>
    <Subtext>
      Grey & Brady discuss the British 'heat wave', water on Mars, Trypophobia, Kit Kat Trademarks,
      anti-dog discrimination, and YouTube's new news initiative and fake news.
    </Subtext>

    <Heading>Duration</Heading>
    <Subtext>1 Hour 38 Minutes 43 Seconds</Subtext>

    <Heading>Publish Date</Heading>
    <Subtext>July 31st, 2018</Subtext>
  </div>
)

export default EpisodeMetadataPanel
