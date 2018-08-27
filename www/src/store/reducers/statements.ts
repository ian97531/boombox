import { IStatement } from '@boombox/shared/types/models'
import * as StatementsActions from 'store/actions/statements'
import { createBasicReducer } from 'utilities/ReducerUtils'

export interface IStatementsStore {
  pending: boolean
  error: string | null
  fetched: boolean
  // TODO(ndrwhr): Include the actual type for API responses.
  statements: IStatement[]
}

const DEFAULT_STATE: IStatementsStore = {
  error: null,
  fetched: false,
  pending: false,
  statements: [],
}

const statementsReducer = createBasicReducer(DEFAULT_STATE, {
  [StatementsActions.GET_STATEMENTS_PENDING]: state => ({
    ...state,
    pending: true,
  }),
  [StatementsActions.GET_STATEMENTS_ERROR]: (state, action) => ({
    ...state,
    error: action.error as string,
    pending: false,
  }),
  [StatementsActions.GET_STATEMENTS_SUCCESS]: (state, action) => ({
    ...state,
    error: null,
    fetched: true,
    pending: false,
    // TODO(ndrwhr): Don't just blindly append onto the end, i.e. make sure the statements are
    // sorted correctly. Also be better about typing one we have API types in the client.
    statements: [...state.statements, ...action.response.response],
  }),
})

export default statementsReducer
