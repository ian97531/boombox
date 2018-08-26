import ConversationPanel from 'components/ConversationPanel';
import EpisodeMetadataPanel from 'components/EpisodeMetadataPanel';
import * as React from 'react';
import './EpisodePage.css';

const EpisodePage: React.SFC = () => (
  <div className="EpisodePage">
    <div className="EpisodePage__conversation">
      <ConversationPanel />
    </div>
    <div className="EpisodePage__metadata">
      <EpisodeMetadataPanel />
    </div>
  </div>
);

export default EpisodePage;
