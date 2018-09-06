import { IEpisodeListResponse } from '@boombox/shared/types/responses'
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

export const getEpisodesSuccess = (response: IEpisodeListResponse) => ({
  response,
  type: GET_EPISODES_SUCCESS,
})

// TODO(ndrwhr): This action should accept a podcast id.
// TODO(ndrwhr): Figure out typing of the getStateFunction.
export const getEpisodes: ActionCreator<any> = () => (dispatch: Dispatch, getState: any) => {
  const state: { episodes: IEpisodesStore } = getState()
  const episodeIds = state.episodes.episodeIds

  // Only fetch once for now.
  if (!episodeIds.length) {
    dispatch(getEpisodesPending())

    // TODO(ndrwhr): Replace this with an actual fetch.
    setTimeout(() => {
      dispatch(
        getEpisodesSuccess({
          info: {
            moreResults: true,
            numResults: 3,
            pageSize: 3,
            statusCode: 200,
          },
          response: [
            {
              duration: '1 Hour 43 Minutes 23 Seconds',
              episodeId: '52d66949e4b0a8cec3bcdd4652d67282e4b0cca8969714fa5b805772562fa70992d6c494',
              imageURL: '',
              mp3URL: '/audio/test-45.mp3',
              podcastId: '1916e5de8675429fa6e378083629ddd8',
              publishedAt: 'July 31st, 2018',
              speakers: ['40706f5e633a4615abd3d981e096b9d0', '36983581cbcb4d878a303c62ca47cf2b'],
              summary:
                'Grey & Brady discuss the British ‘heat wave’, water on Mars, Trypophobia, Kit Kat Trademarks, anti-dog discrimination, and YouTube’s new news initiative and fake news.',
              title: 'H.I. #106: Water on Mars',
            },
            {
              duration: '1 Hour 26 Minutes 23 Seconds',
              episodeId: 'd44ebdcc752044118844c62b4d090137',
              imageURL: '',
              mp3URL: '/audio/test-45.mp3',
              podcastId: '1916e5de8675429fa6e378083629ddd8',
              publishedAt: 'July 20, 2018',
              speakers: ['40706f5e633a4615abd3d981e096b9d0', '36983581cbcb4d878a303c62ca47cf2b'],
              summary:
                'Brady & Grey discuss: the fasten your seatbelt sign, breaking news feedback about Garth the Deer, a big round of Hello Internet show and tell, and Grey reviews his time on Instagram.',
              title: 'A Recent Hello Internet',
            },
          ],
        })
      )
    }, 1500)
  }
}