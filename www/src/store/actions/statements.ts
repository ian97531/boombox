import { IStatementListResponse } from '@boombox/shared/types/responses'
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

export const getStatementsSuccess = (
  options: IGetStatementsOptions,
  response: IStatementListResponse
) => ({
  response,
  type: GET_STATEMENTS_SUCCESS,
})

export const getStatements: ActionCreator<any> = (options: IGetStatementsOptions = {}) => {
  return (dispatch: Dispatch<AnyAction>): void => {
    dispatch(getStatementsPending(options))

    // TODO(ndrwhr): Replace this with an actual fetch.
    setTimeout(() => {
      dispatch(
        getStatementsSuccess(options, {
          info: {
            moreResults: true,
            numResults: 3,
            pageSize: 3,
            startTime: 0,
            statusCode: 200,
          },
          response: [
            {
              endTime: 1.6,
              speaker: {
                avatarURL:
                  'https://pbs.twimg.com/profile_images/1000314268699496448/Z33QNrPc_400x400.jpg',
                guid: 'cgp-grey',
                name: 'CGP Grey',
              },
              startTime: 0.14,
              words: [
                {
                  content: 'begin',
                  endTime: 0.75,
                  startTime: 0.14,
                },
                {
                  content: 'Brady',
                  endTime: 1.16,
                  startTime: 0.86,
                },
                {
                  content: 'story',
                  endTime: 1.6,
                  startTime: 1.16,
                },
              ],
            },
            {
              endTime: 8.17,
              speaker: {
                avatarURL:
                  'https://pbs.twimg.com/profile_images/494927670212583424/uHY6SXxQ_400x400.jpeg',
                guid: 'brady-haran',
                name: 'Brady Haran',
              },
              startTime: 3.87,
              words: [
                {
                  content: 'so',
                  endTime: 4.1,
                  startTime: 3.87,
                },
                {
                  content: 'you',
                  endTime: 4.28,
                  startTime: 4.1,
                },
                {
                  content: 'know',
                  endTime: 4.58,
                  startTime: 4.28,
                },
                {
                  content: "I'm",
                  endTime: 4.28,
                  startTime: 5.29,
                },
                {
                  content: 'back',
                  endTime: 5.8,
                  startTime: 5.55,
                },
                {
                  content: 'on',
                  endTime: 6.11,
                  startTime: 5.8,
                },
                {
                  content: 'the',
                  endTime: 6.27,
                  startTime: 6.14,
                },
                {
                  content: 'fiddle',
                  endTime: 6.55,
                  startTime: 6.29,
                },
                {
                  content: 'tron',
                  endTime: 6.79,
                  startTime: 6.55,
                },
                {
                  content: 'bandwagon',
                  endTime: 7.45,
                  startTime: 6.79,
                },
                {
                  content: 'at',
                  endTime: 7.52,
                  startTime: 7.45,
                },
                {
                  content: 'the',
                  endTime: 7.6,
                  startTime: 7.52,
                },
                {
                  content: 'moment',
                  endTime: 7.93,
                  startTime: 7.6,
                },
                {
                  content: 'fit',
                  endTime: 8.17,
                  startTime: 7.94,
                },
              ],
            },
            {
              endTime: 9.44,
              speaker: {
                avatarURL:
                  'https://pbs.twimg.com/profile_images/1000314268699496448/Z33QNrPc_400x400.jpg',
                guid: 'cgp-grey',
                name: 'CGP Grey',
              },
              startTime: 8.17,
              words: [
                {
                  content: 'it',
                  endTime: 8.34,

                  startTime: 8.17,
                },
                {
                  content: 'on',
                  endTime: 8.5,

                  startTime: 8.34,
                },
                {
                  content: 'five',
                  endTime: 8.85,
                  startTime: 8.5,
                },
                {
                  content: 'thousand',
                  endTime: 9.44,
                  startTime: 8.85,
                },
              ],
            },
          ],
        })
      )
    }, 3000)

    // TODO(ndrwhr): Add an API class for consistent fetching and options constructing.
    // fetch('/statements')
    //   .then(response => response.json())
    //   .then(json => dispatch(getStatementsSuccess(options, json)))
    //   .catch(error => dispatch(getStatementsError(options, error)));
  }
}
