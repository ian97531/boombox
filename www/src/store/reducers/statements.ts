import { IStatement } from '@boombox/shared/types/models'
import {
  IGetStatementErrorAction,
  IGetStatementPendingAction,
  IGetStatementSuccessAction,
  StatementAction,
} from 'store/actions/statements'
import { createBasicReducer } from 'utilities/ReducerUtils'

export interface IStatementsStore {
  episodeSlug: string | null
  podcastSlug: string | null
  pending: boolean
  error: string | null
  fetched: boolean
  statements: IStatement[]
}

const DEFAULT_STATE: IStatementsStore = {
  episodeSlug: null,
  error: null,
  fetched: false,
  pending: false,
  podcastSlug: null,
  statements: [],
}

const statementsReducer = createBasicReducer(DEFAULT_STATE, {
  [StatementAction.GET_STATEMENTS_PENDING]: (state, action: IGetStatementPendingAction) => ({
    ...state,
    episodeSlug: action.options.episodeSlug,
    pending: true,
    podcastSlug: action.options.podcastSlug,
    statements: [],
  }),
  [StatementAction.GET_STATEMENTS_ERROR]: (state, action: IGetStatementErrorAction) => ({
    ...state,
    error: action.error,
    pending: false,
  }),
  [StatementAction.GET_STATEMENTS_SUCCESS]: (state, action: IGetStatementSuccessAction) => ({
    ...state,
    error: null,
    fetched: true,
    pending: action.moreResults,
    // TODO(ndrwhr): Don't just blindly append onto the end, i.e. make sure the statements are
    // sorted correctly.
    statements: [...state.statements, ...action.statements],
  }),
})

export default statementsReducer
