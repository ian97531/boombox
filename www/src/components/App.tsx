import EpisodeListPage from 'components/EpisodeListPage'
import EpisodePage from 'components/EpisodePage'
import SpriteSheet from 'components/utilities/SpriteSheet'
import { WindowEvents } from 'components/WindowEvents'
import * as React from 'react'
import { Link, Route } from 'react-router-dom'
import './App.css'

const App: React.SFC = () => (
  <WindowEvents>
    <div className="App">
      <SpriteSheet />

      <div className="App__header">
        <Link className="App__header-name" to="/">
          BOOMBOX
        </Link>
      </div>
      <div className="App__content">
        <Route exact={true} path="/podcasts/:podcastSlug" component={EpisodeListPage} />
        <Route exact={true} path="/podcasts/:podcastSlug/:episodeSlug" component={EpisodePage} />
      </div>
      <div className="App__player" />
    </div>
  </WindowEvents>
)

export default App
