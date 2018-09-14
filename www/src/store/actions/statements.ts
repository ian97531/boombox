import { IStatement } from '@boombox/shared/types/models'
import { IListResponse } from '@boombox/shared/types/responses'
import { AxiosResponse } from 'axios'
import { Action, ActionCreator, AnyAction, Dispatch } from 'redux'
import { api } from 'utilities/axios'

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
  start?: number
}

export interface IGetStatementPendingAction extends Action {
  options: IGetStatementsOptions
  type: StatementAction.GET_STATEMENTS_PENDING
}

export interface IGetStatementErrorAction extends Action {
  error: string
  options: IGetStatementsOptions
  type: StatementAction.GET_STATEMENTS_ERROR
}

export interface IGetStatementSuccessAction extends Action {
  totalItems: number
  options: IGetStatementsOptions
  statements: IStatement[]
  type: StatementAction.GET_STATEMENTS_SUCCESS
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
  totalItems: number,
  statements: IStatement[]
): IGetStatementSuccessAction => ({
  options,
  statements,
  totalItems,
  type: StatementAction.GET_STATEMENTS_SUCCESS,
})

export const getStatements: ActionCreator<any> = (options: IGetStatementsOptions) => {
  return async (dispatch: Dispatch<AnyAction>): Promise<void> => {
    dispatch(getStatementsPending(options))

    let moreResults = true
    const params = {
      pageSize: options.pageSize || 50,
      start: options.start || 0,
    }

    try {
      while (moreResults) {
        const response: AxiosResponse<IListResponse<IStatement>> = await api.get(
          '/podcasts/' + options.podcastSlug + '/episodes/' + options.episodeSlug + '/statements/',
          { params }
        )

        if (response.data.info.nextItem) {
          params.start = response.data.info.nextItem
        } else {
          moreResults = false
        }

        dispatch(getStatementsSuccess(options, response.data.info.totalItems, response.data.items))
      }
    } catch (err) {
      dispatch(getStatementsError(options, err.message))
    }
  }
}
