import { IEpisode } from '@boombox/shared/src/types/models/episode'
import { IItemResponse, IListResponse } from '@boombox/shared/src/types/responses'
import { AxiosResponse } from 'axios'
import { Action, ActionCreator, AnyAction, Dispatch } from 'redux'
import { api } from 'utilities/axios'

export enum EpisodesAction {
  GET_EPISODES = 'GET_EPISODES',
  GET_EPISODES_PENDING = 'GET_EPISODES_PENDING',
  GET_SINGLE_EPISODE_PENDING = 'GET_SINGLE_EPISODE_PENDING',
  GET_EPISODES_ERROR = 'GET_EPISODES_ERROR',
  GET_SINGLE_EPISODE_ERROR = 'GET_SINGLE_EPISODE_ERROR',
  GET_EPISODES_SUCCESS = 'GET_EPISODES_SUCCESS',
  GET_SINGLE_EPISODE_SUCCESS = 'GET_SINGLE_EPISODE_SUCCESS',
}

export interface IGetEpisodesOptions {
  podcastSlug: string
  pageSize?: number
  start?: string
}

export interface IGetSingleEpisodeOptions {
  podcastSlug: string
  episodeSlug: string
}

export interface IGetEpisodesPendingAction extends Action {
  options: IGetEpisodesOptions
  type: EpisodesAction.GET_EPISODES_PENDING
}

export interface IGetEpisodesErrorAction extends Action {
  error: string
  options: IGetEpisodesOptions
  type: EpisodesAction.GET_EPISODES_ERROR
}

export interface IGetEpisodesSuccessAction extends Action {
  options: IGetEpisodesOptions
  episodes: IEpisode[]
  totalItems: number
  type: EpisodesAction.GET_EPISODES_SUCCESS
}

export interface IGetSingleEpisodePendingAction extends Action {
  options: IGetSingleEpisodeOptions
  type: EpisodesAction.GET_SINGLE_EPISODE_PENDING
}

export interface IGetSingleEpisodeErrorAction extends Action {
  error: string
  options: IGetSingleEpisodeOptions
  type: EpisodesAction.GET_SINGLE_EPISODE_ERROR
}

export interface IGetSingleEpisodeSuccessAction extends Action {
  options: IGetSingleEpisodeOptions
  episode: IEpisode
  type: EpisodesAction.GET_SINGLE_EPISODE_SUCCESS
}

export const getEpisodesPending = (options: IGetEpisodesOptions): IGetEpisodesPendingAction => ({
  options,
  type: EpisodesAction.GET_EPISODES_PENDING,
})

export const getEpisodesError = (
  options: IGetEpisodesOptions,
  error: string
): IGetEpisodesErrorAction => ({
  error,
  options,
  type: EpisodesAction.GET_EPISODES_ERROR,
})

export const getEpisodesSuccess = (
  options: IGetEpisodesOptions,
  totalItems: number,
  episodes: IEpisode[]
): IGetEpisodesSuccessAction => ({
  episodes,
  options,
  totalItems,
  type: EpisodesAction.GET_EPISODES_SUCCESS,
})

export const getSingleEpisodePending = (
  options: IGetSingleEpisodeOptions
): IGetSingleEpisodePendingAction => ({
  options,
  type: EpisodesAction.GET_SINGLE_EPISODE_PENDING,
})

export const getSingleEpisodeError = (
  options: IGetSingleEpisodeOptions,
  error: string
): IGetSingleEpisodeErrorAction => ({
  error,
  options,
  type: EpisodesAction.GET_SINGLE_EPISODE_ERROR,
})

export const getSingleEpisodeSuccess = (
  options: IGetSingleEpisodeOptions,
  episode: IEpisode
): IGetSingleEpisodeSuccessAction => ({
  episode,
  options,
  type: EpisodesAction.GET_SINGLE_EPISODE_SUCCESS,
})

export const getEpisodes: ActionCreator<any> = (options: IGetEpisodesOptions) => {
  return async (dispatch: Dispatch<AnyAction>): Promise<void> => {
    dispatch(getEpisodesPending(options))

    let moreResults = true
    const params: { pageSize: number; start?: string } = {
      pageSize: options.pageSize || 50,
    }

    try {
      while (moreResults) {
        const response: AxiosResponse<IListResponse<IEpisode>> = await api.get(
          '/podcasts/' + options.podcastSlug + '/episodes',
          { params }
        )

        if (response.data.info.nextItem) {
          params.start = response.data.info.nextItem as string
        } else {
          moreResults = false
        }

        dispatch(getEpisodesSuccess(options, response.data.info.totalItems, response.data.items))
      }
    } catch (err) {
      dispatch(getEpisodesError(options, err.message))
    }
  }
}

export const getEpisode: ActionCreator<any> = (options: IGetSingleEpisodeOptions) => {
  return async (dispatch: Dispatch<AnyAction>): Promise<void> => {
    dispatch(getSingleEpisodePending(options))

    try {
      const response: AxiosResponse<IItemResponse<IEpisode>> = await api.get(
        '/podcasts/' + options.podcastSlug + '/episodes/' + options.episodeSlug
      )

      dispatch(getSingleEpisodeSuccess(options, response.data.item))
    } catch (err) {
      dispatch(getSingleEpisodeError(options, err.message))
    }
  }
}
