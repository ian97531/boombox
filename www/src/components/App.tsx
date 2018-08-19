import * as React from 'react';

import ConversationPanel from 'components/ConversationPanel';
import EpisodeMetadataPanel from 'components/EpisodeMetadataPanel';
import Player from 'components/player/Player';

import './App.css';

const App: React.SFC = () => (
  <div className="App">
    <div className="App__header">Header...</div>
    <div className="App__content">
      <ConversationPanel />
      <EpisodeMetadataPanel />
    </div>
    <div className="App__player">
      <Player />
    </div>
  </div>
);

export default App;
