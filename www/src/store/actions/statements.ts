import { IStatementListResponse } from '@boombox/shared/types/responses'
import { ActionCreator, AnyAction, Dispatch } from 'redux'
import { api } from 'utilities/axios'

export const GET_STATEMENTS = 'GET_STATEMENTS'
export const GET_STATEMENTS_PENDING = 'GET_STATEMENTS_PENDING'
export const GET_STATEMENTS_ERROR = 'GET_STATEMENTS_ERROR'
export const GET_STATEMENTS_SUCCESS = 'GET_STATEMENTS_SUCCESS'

export interface IGetStatementsOptions {
  episodeId: string
  pageSize?: number
  startTime?: number
}

export const getStatementsPending = (options: IGetStatementsOptions) => ({
  options,
  type: GET_STATEMENTS_PENDING,
})

export const getStatementsError = (options: IGetStatementsOptions, error: any) => ({
  error,
  options,
  type: GET_STATEMENTS_ERROR,
})

export const getStatementsSuccess = (
  options: IGetStatementsOptions,
  response: IStatementListResponse
) => ({
  options,
  response,
  type: GET_STATEMENTS_SUCCESS,
})

export const getStatements: ActionCreator<any> = (options: IGetStatementsOptions) => {
  return (dispatch: Dispatch<AnyAction>): void => {
    dispatch(getStatementsPending(options))

    api.get('/statements/' + options.episodeId).then(response => {
      dispatch(getStatementsSuccess(options, response.data))
    })
  }
}
