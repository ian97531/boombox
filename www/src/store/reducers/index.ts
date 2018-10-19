import { combineReducers } from 'redux'
import episodes from 'store/reducers/episodes'
import player from 'store/reducers/player'
import podcasts from 'store/reducers/podcasts'
import statements from 'store/reducers/statements'
import windowEvents from 'store/reducers/windowEvents'

export default combineReducers({
  episodes,
  player,
  podcasts,
  statements,
  windowEvents,
})
