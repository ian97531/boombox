import { IStatement } from '@boombox/shared/types/models'
import { IStatementListResponse } from '@boombox/shared/types/responses'
import { Action, ActionCreator, AnyAction, Dispatch } from 'redux'
import { api } from 'utilities/axios'
import { AxiosResponse } from '../../../node_modules/axios'

export enum StatementAction {
  GET_STATEMENTS = 'GET_STATEMENTS',
  GET_STATEMENTS_PENDING = 'GET_STATEMENTS_PENDING',
  GET_STATEMENTS_ERROR = 'GET_STATEMENTS_ERROR',
  GET_STATEMENTS_SUCCESS = 'GET_STATEMENTS_SUCCESS',
}

export interface IGetStatementsOptions {
  episodeSlug: string
  podcastSlug: string
  pageSize?: number
  startTime?: number
}

export interface IGetStatementPendingAction extends Action {
  options: IGetStatementsOptions
  type: StatementAction
}

export interface IGetStatementErrorAction extends Action {
  error: string
  options: IGetStatementsOptions
  type: StatementAction
}

export interface IGetStatementSuccessAction extends Action {
  moreResults: boolean
  options: IGetStatementsOptions
  statements: IStatement[]
  type: StatementAction
}

export const getStatementsPending = (
  options: IGetStatementsOptions
): IGetStatementPendingAction => ({
  options,
  type: StatementAction.GET_STATEMENTS_PENDING,
})

export const getStatementsError = (
  options: IGetStatementsOptions,
  error: string
): IGetStatementErrorAction => ({
  error,
  options,
  type: StatementAction.GET_STATEMENTS_ERROR,
})

export const getStatementsSuccess = (
  options: IGetStatementsOptions,
  moreResults: boolean,
  statements: IStatement[]
): IGetStatementSuccessAction => ({
  moreResults,
  options,
  statements,
  type: StatementAction.GET_STATEMENTS_SUCCESS,
})

export const getStatements: ActionCreator<any> = (options: IGetStatementsOptions) => {
  return async (dispatch: Dispatch<AnyAction>): Promise<void> => {
    dispatch(getStatementsPending(options))

    let moreResults = true
    const params = {
      pageSize: options.pageSize || 50,
      startTime: options.startTime || 0,
    }

    try {
      while (moreResults) {
        const response: AxiosResponse<IStatementListResponse> = await api.get(
          '/podcasts/' + options.podcastSlug + '/episodes/' + options.episodeSlug + '/statements/',
          { params }
        )

        if (response.data.info.moreResults) {
          const lastStatement = response.data.response[response.data.response.length - 1]
          params.startTime = lastStatement.endTime
        } else {
          moreResults = false
        }

        dispatch(getStatementsSuccess(options, moreResults, response.data.response))
      }
    } catch (err) {
      dispatch(getStatementsError(options, err.message))
    }
  }
}
