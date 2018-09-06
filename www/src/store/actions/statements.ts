import { IStatementListResponse } from '@boombox/shared/types/responses'
import { ActionCreator, AnyAction, Dispatch } from 'redux'
import axios from 'utilities/axios'

export const GET_STATEMENTS = 'GET_STATEMENTS'
export const GET_STATEMENTS_PENDING = 'GET_STATEMENTS_PENDING'
export const GET_STATEMENTS_ERROR = 'GET_STATEMENTS_ERROR'
export const GET_STATEMENTS_SUCCESS = 'GET_STATEMENTS_SUCCESS'

export interface IGetStatementsOptions {
  startTime?: number
  pageSize?: number
}

export const getStatementsPending = (options: IGetStatementsOptions, episodeId: string) => ({
  episodeId,
  options,
  type: GET_STATEMENTS_PENDING,
})

export const getStatementsError = (options: IGetStatementsOptions, error: any) => ({
  error,
  type: GET_STATEMENTS_ERROR,
})

export const getStatementsSuccess = (
  options: IGetStatementsOptions,
  response: IStatementListResponse
) => ({
  response,
  type: GET_STATEMENTS_SUCCESS,
})

export const getStatements: ActionCreator<any> = (
  episodeId: string,
  options: IGetStatementsOptions = {}
) => {
  return (dispatch: Dispatch<AnyAction>): void => {
    dispatch(getStatementsPending(options, episodeId))

    axios.get('/statements/' + episodeId).then(response => {
      dispatch(getStatementsSuccess(options, response.data))
    })
  }
}
