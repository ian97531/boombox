import { IEpisode } from '@boombox/shared/types/models'
import { IListResponse } from '@boombox/shared/types/responses'
import { ActionCreator, Dispatch } from 'redux'
import { IEpisodesStore } from 'store/reducers/episodes'

export const GET_EPISODES = 'GET_EPISODES'
export const GET_EPISODES_PENDING = 'GET_EPISODES_PENDING'
export const GET_EPISODES_ERROR = 'GET_EPISODES_ERROR'
export const GET_EPISODES_SUCCESS = 'GET_EPISODES_SUCCESS'

export const getEpisodesPending = () => ({
  type: GET_EPISODES_PENDING,
})

export const getEpisodesError = (error: any) => ({
  error,
  type: GET_EPISODES_ERROR,
})

export const getEpisodesSuccess = (response: IListResponse<IEpisode>) => ({
  episodes: response.items,
  type: GET_EPISODES_SUCCESS,
})

// TODO(ndrwhr): This action should accept a podcast id.
// TODO(ndrwhr): Figure out typing of the getStateFunction.
export const getEpisodes: ActionCreator<any> = () => (dispatch: Dispatch, getState: any) => {
  const state: { episodes: IEpisodesStore } = getState()

  // Only fetch once for now.
  if (!Object.keys(state.episodes.episodes).length) {
    dispatch(getEpisodesPending())

    // TODO(ndrwhr): Replace this with an actual fetch.
    setTimeout(() => {
      dispatch(
        getEpisodesSuccess({
          info: {
            nextItem: 111,
            numItems: 2,
            pageSize: 3,
            start: 0,
            statusCode: 200,
            totalItems: 2,
          },
          items: [
            {
              duration: 7307,
              imageURL: '',
              mp3URL: '/audio/test-45.mp3',
              podcastSlug: 'hello-internet',
              publishTimestamp: 1535564596,
              publishedAt: 'July 31st, 2018',
              slug: 'hi-108-project-cyclops',
              speakers: ['brady-haran', 'cgp-grey'],
              summary:
                "Grey and Brady discuss: Brady story time, KSI vs Logan Paul, left vs right & heroes vs villains, why-don't-you-just-ism, Formula One, and Grey is concerned about the attention economy and his own attention span.",
              title: 'H.I. #108: Project Cyclops',
              totalStatements: 732,
            },
            {
              duration: 5871,
              imageURL: '',
              mp3URL: '/audio/test-45.mp3',
              podcastSlug: 'hello-internet',
              publishTimestamp: 1535137731,
              publishedAt: 'July 20, 2018',
              slug: 'hi-107-one-year-of-weird',
              speakers: ['brady-haran', 'cgp-grey'],
              summary:
                'Brady and Grey discuss: a FOT5k story (or is it?), passing the Brady Turing Test, paper straws, liveable cities, the morality of snakes and ladders, pony painting parties, and Space Force.',
              title: 'H.I. #107: One Year of Weird',
              totalStatements: 674,
            },
          ],
        })
      )
    }, 1500)
  }
}
