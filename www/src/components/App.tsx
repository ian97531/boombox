import EpisodePage from 'components/EpisodePage';
import Player from 'components/player/Player';
import * as React from 'react';

import './App.css';

const App: React.SFC = () => (
  <div className="App">
    <div className="App__header">
      <div className="App__header-name">BOOMBOX</div>
    </div>
    <div className="App__content">
      <EpisodePage />
    </div>
    <div className="App__player">
      <Player />
    </div>
  </div>
);

export default App;
