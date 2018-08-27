import { combineReducers } from 'redux'
import player from 'store/reducers/player'
import statements from 'store/reducers/statements'

export default combineReducers({
  player,
  statements,
})
