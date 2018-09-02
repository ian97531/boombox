import { IEpisode } from '@boombox/shared/types/models'
import * as EpisodesActions from 'store/actions/episodes'
import { createBasicReducer } from 'utilities/ReducerUtils'

export interface IEpisodesStore {
  episodeIds: string[]
  episodes: { [id: string]: IEpisode }
  error: string | null
  fetched: boolean
  pending: boolean
}

const DEFAULT_STATE: IEpisodesStore = {
  episodeIds: [],
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
    action.response.response.forEach((episode: IEpisode) => {
      updatedEpisodes[episode.episodeId] = episode
    })

    return {
      ...state,
      // TODO(ndrwhr): Keep the list of episodes sorted by publish date or something.
      episodeIds: Object.keys(updatedEpisodes),
      episodes: updatedEpisodes,
      error: null,
      fetched: true,
      pending: false,
    }
  },
})

export default episodesReducer
