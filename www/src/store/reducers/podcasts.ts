import { IPodcast } from '@boombox/shared'
import {
  IGetSinglePodcastErrorAction,
  IGetSinglePodcastPendingAction,
  IGetSinglePodcastSuccessAction,
  PodcastsAction,
} from 'store/actions/podcasts'
import { createBasicReducer } from 'utilities/ReducerUtils'

export interface IPodcastsStore {
  podcasts: { [id: string]: IPodcast }
  error: string | null
  fetched: boolean
  pending: boolean
}

const DEFAULT_STATE: IPodcastsStore = {
  error: null,
  fetched: false,
  pending: false,
  podcasts: {},
}

const episodesReducer = createBasicReducer(DEFAULT_STATE, {
  [PodcastsAction.GET_SINGLE_PODCAST_PENDING]: (state, action: IGetSinglePodcastPendingAction) => ({
    ...state,
    pending: true,
  }),
  [PodcastsAction.GET_SINGLE_PODCAST_ERROR]: (state, action: IGetSinglePodcastErrorAction) => ({
    ...state,
    error: action.error as string,
    pending: false,
  }),
  [PodcastsAction.GET_SINGLE_PODCAST_SUCCESS]: (state, action: IGetSinglePodcastSuccessAction) => {
    const updatedPodcasts = { ...state.podcasts }
    const podcast = action.podcast
    updatedPodcasts[podcast.slug] = podcast

    return {
      ...state,
      error: null,
      fetched: true,
      pending: false,
      podcasts: updatedPodcasts,
    }
  },
})

export default episodesReducer
