import { IEpisode } from '@boombox/shared/src/types/models'
import {
  EpisodesAction,
  IGetEpisodesErrorAction,
  IGetEpisodesPendingAction,
  IGetEpisodesSuccessAction,
  IGetSingleEpisodeErrorAction,
  IGetSingleEpisodePendingAction,
  IGetSingleEpisodeSuccessAction,
} from 'store/actions/episodes'
import { createBasicReducer } from 'utilities/ReducerUtils'

export interface IEpisodesStore {
  episodes: { [id: string]: { [id: string]: IEpisode } }
  error: string | null
  fetched: boolean
  pending: boolean
}

const DEFAULT_STATE: IEpisodesStore = {
  episodes: {},
  error: null,
  fetched: false,
  pending: false,
}

const episodesReducer = createBasicReducer(DEFAULT_STATE, {
  [EpisodesAction.GET_EPISODES_PENDING]: (state, action: IGetEpisodesPendingAction) => ({
    ...state,
    pending: true,
  }),
  [EpisodesAction.GET_EPISODES_ERROR]: (state, action: IGetEpisodesErrorAction) => ({
    ...state,
    error: action.error as string,
    pending: false,
  }),
  [EpisodesAction.GET_EPISODES_SUCCESS]: (state, action: IGetEpisodesSuccessAction) => {
    const updatedEpisodes = { ...state.episodes }
    action.episodes.forEach((episode: IEpisode) => {
      if (!updatedEpisodes[episode.podcastSlug]) {
        updatedEpisodes[episode.podcastSlug] = {}
      }
      updatedEpisodes[episode.podcastSlug][episode.slug] = episode
    })

    return {
      ...state,
      // TODO(ndrwhr): Keep the list of episodes sorted by publish date or something.
      episodes: updatedEpisodes,
      error: null,
      fetched: true,
      pending: false,
    }
  },
  [EpisodesAction.GET_SINGLE_EPISODE_PENDING]: (state, action: IGetSingleEpisodePendingAction) => ({
    ...state,
    pending: true,
  }),
  [EpisodesAction.GET_SINGLE_EPISODE_ERROR]: (state, action: IGetSingleEpisodeErrorAction) => ({
    ...state,
    error: action.error as string,
    pending: false,
  }),
  [EpisodesAction.GET_SINGLE_EPISODE_SUCCESS]: (state, action: IGetSingleEpisodeSuccessAction) => {
    const updatedEpisodes = { ...state.episodes }
    const episode = action.episode
    if (!updatedEpisodes[episode.podcastSlug]) {
      updatedEpisodes[episode.podcastSlug] = {}
    }
    updatedEpisodes[episode.podcastSlug][episode.slug] = episode

    return {
      ...state,
      // TODO(ndrwhr): Keep the list of episodes sorted by publish date or something.
      episodes: updatedEpisodes,
      error: null,
      fetched: true,
      pending: false,
    }
  },
})

export default episodesReducer
