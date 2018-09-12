import { IEpisode } from '@boombox/shared/types/models'
import * as EpisodesActions from 'store/actions/episodes'
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
  [EpisodesActions.GET_EPISODES_PENDING]: state => ({
    ...state,
    pending: true,
  }),
  [EpisodesActions.GET_EPISODES_ERROR]: (state, action) => ({
    ...state,
    error: action.error as string,
    pending: false,
  }),
  [EpisodesActions.GET_EPISODES_SUCCESS]: (state, action) => {
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
})

export default episodesReducer
