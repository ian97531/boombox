import 'normalize.css'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { applyMiddleware, createStore } from 'redux'
import thunk from 'redux-thunk'
import { playerUpdate } from 'store/actions/player'
import App from './components/App'
import './index.css'
import registerServiceWorker from './registerServiceWorker'
import reducers from './store/reducers'
import AudioController from './utilities/AudioController'

const store = createStore(reducers, applyMiddleware(thunk))

// Propagate AudioController changes to the store.
AudioController.addListener(() =>
  store.dispatch(
    playerUpdate({
      currentTime: AudioController.currentTime,
      duration: AudioController.duration,
      status: AudioController.status,
    })
  )
)

// TODO(ndrwhr): This should be kicked off somewhere in the app.
const DEFAULT_AUDIO_URL = './audio/test-45.mp3'
AudioController.setSrc(DEFAULT_AUDIO_URL)

ReactDOM.render(
  <Provider store={store}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Provider>,
  document.getElementById('root') as HTMLElement
)

registerServiceWorker()
