import { IStatement } from '@boombox/shared'
import {
  IGetStatementErrorAction,
  IGetStatementPendingAction,
  IGetStatementSuccessAction,
  StatementAction,
} from 'store/actions/statements'
import { createBasicReducer } from 'utilities/ReducerUtils'

interface IEpisodeStatementStore {
  pending: boolean
  error: string | null
  fetched: boolean
  statements: IStatement[]
  totalStatements: number
}

export interface IStatementsStore {
  episodes: { [key: string]: { [key: string]: IEpisodeStatementStore } }
}

const DEFAULT_STATE: IStatementsStore = {
  episodes: {},
}

const DEFAULT_EPISODE_STATEMENT: IEpisodeStatementStore = {
  error: null,
  fetched: false,
  pending: false,
  statements: [],
  totalStatements: 0,
}

const statementsReducer = createBasicReducer(DEFAULT_STATE, {
  [StatementAction.GET_STATEMENTS_PENDING]: (state, action: IGetStatementPendingAction) => {
    const episodes = { ...state.episodes }
    if (!episodes[action.options.podcastSlug]) {
      episodes[action.options.podcastSlug] = {}
    }
    episodes[action.options.podcastSlug][action.options.episodeSlug] = {
      ...DEFAULT_EPISODE_STATEMENT,
      pending: true,
    }

    return { episodes }
  },
  [StatementAction.GET_STATEMENTS_ERROR]: (state, action: IGetStatementErrorAction) => {
    const episodes = { ...state.episodes }
    if (!episodes[action.options.podcastSlug]) {
      episodes[action.options.podcastSlug] = {}
    }
    episodes[action.options.podcastSlug][action.options.episodeSlug] = {
      ...DEFAULT_EPISODE_STATEMENT,
      error: action.error,
      pending: false,
    }

    return { episodes }
  },
  [StatementAction.GET_STATEMENTS_SUCCESS]: (state, action: IGetStatementSuccessAction) => {
    const episodes = { ...state.episodes }
    let statements: IStatement[] = []
    if (!episodes[action.options.podcastSlug]) {
      episodes[action.options.podcastSlug] = {}
    } else if (episodes[action.options.podcastSlug][action.options.episodeSlug].statements) {
      statements = episodes[action.options.podcastSlug][action.options.episodeSlug].statements
    }
    episodes[action.options.podcastSlug][action.options.episodeSlug] = {
      ...DEFAULT_EPISODE_STATEMENT,
      fetched: true,
      pending: statements.length + action.statements.length === action.totalItems,
      // TODO(ndrwhr): Don't just blindly append onto the end, i.e. make sure the statements are
      // sorted correctly.
      statements: [...statements, ...action.statements],
      totalStatements: action.totalItems,
    }

    return { episodes }
  },
})

export default statementsReducer
