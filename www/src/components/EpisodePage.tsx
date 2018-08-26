import ConversationPanel from 'components/ConversationPanel';
import EpisodeMetadataPanel from 'components/EpisodeMetadataPanel';
import * as React from 'react';
import './EpisodePage.css';

const EpisodePage: React.SFC = () => (
  <div className="Episode">
    <div className="Episode__conversation">
      <ConversationPanel />
    </div>
    <div className="Episode__metadata">
      <EpisodeMetadataPanel />
    </div>
  </div>
);

export default EpisodePage;
