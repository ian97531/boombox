import { combineReducers } from 'redux'
import episodes from 'store/reducers/episodes'
import player from 'store/reducers/player'
import statements from 'store/reducers/statements'

export default combineReducers({
  episodes,
  player,
  statements,
})
