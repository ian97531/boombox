import EpisodeListPage from 'components/EpisodeListPage'
import EpisodePage from 'components/EpisodePage'
import * as React from 'react'
import { Link, Route } from 'react-router-dom'
import './App.css'

const App: React.SFC = () => (
  <div className="App">
    <div className="App__header">
      <Link className="App__header-name" to="/">
        BOOMBOX
      </Link>
    </div>
    <div className="App__content">
      <Route exact={true} path="/" component={EpisodeListPage} />
      <Route path="/episode/:episodeId" component={EpisodePage} />
    </div>
  </div>
)

export default App
