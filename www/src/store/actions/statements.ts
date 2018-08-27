import { ActionCreator, AnyAction, Dispatch } from 'redux'

export const GET_STATEMENTS = 'GET_STATEMENTS'
export const GET_STATEMENTS_PENDING = 'GET_STATEMENTS_PENDING'
export const GET_STATEMENTS_ERROR = 'GET_STATEMENTS_ERROR'
export const GET_STATEMENTS_SUCCESS = 'GET_STATEMENTS_SUCCESS'

export interface IGetStatementsOptions {
  startTime?: number
  pageSize?: number
}

export const getStatementsPending = (options: IGetStatementsOptions) => ({
  options,
  type: GET_STATEMENTS_PENDING,
})

export const getStatementsError = (options: IGetStatementsOptions, error: any) => ({
  error,
  type: GET_STATEMENTS_ERROR,
})

export const getStatementsSuccess = (options: IGetStatementsOptions, response: object) => ({
  response,
  type: GET_STATEMENTS_SUCCESS,
})

export const getStatements: ActionCreator<any> = (options: IGetStatementsOptions = {}) => {
  return (dispatch: Dispatch<AnyAction>): void => {
    dispatch(getStatementsPending(options))

    // TODO(ndrwhr): Replace this with an actual fetch.
    setTimeout(() => {
      dispatch(
        getStatementsSuccess(options, [
          {
            words: ['hello', 'world'],
          },
        ])
      )
    }, 3000)

    // TODO(ndrwhr): Add an API class for consistent fetching and options constructing.
    // fetch('/statements')
    //   .then(response => response.json())
    //   .then(json => dispatch(getStatementsSuccess(options, json)))
    //   .catch(error => dispatch(getStatementsError(options, error)));
  }
}
