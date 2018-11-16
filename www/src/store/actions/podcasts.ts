import { IItemResponse, IPodcast } from '@boombox/shared'
import { AxiosResponse } from 'axios'
import { Action, ActionCreator, AnyAction, Dispatch } from 'redux'
import { api } from 'utilities/axios'

export enum PodcastsAction {
  GET_SINGLE_PODCAST_PENDING = 'GET_SINGLE_PODCAST_PENDING',
  GET_SINGLE_PODCAST_ERROR = 'GET_SINGLE_PODCAST_ERROR',
  GET_SINGLE_PODCAST_SUCCESS = 'GET_SINGLE_PODCAST_SUCCESS',
}

export interface IGetSinglePodcastOptions {
  podcastSlug: string
}

export interface IGetSinglePodcastPendingAction extends Action {
  options: IGetSinglePodcastOptions
  type: PodcastsAction.GET_SINGLE_PODCAST_PENDING
}

export interface IGetSinglePodcastErrorAction extends Action {
  error: string
  options: IGetSinglePodcastOptions
  type: PodcastsAction.GET_SINGLE_PODCAST_ERROR
}

export interface IGetSinglePodcastSuccessAction extends Action {
  options: IGetSinglePodcastOptions
  podcast: IPodcast
  type: PodcastsAction.GET_SINGLE_PODCAST_SUCCESS
}

export const getSinglePodcastPending = (
  options: IGetSinglePodcastOptions
): IGetSinglePodcastPendingAction => ({
  options,
  type: PodcastsAction.GET_SINGLE_PODCAST_PENDING,
})

export const getSinglePodcastError = (
  options: IGetSinglePodcastOptions,
  error: string
): IGetSinglePodcastErrorAction => ({
  error,
  options,
  type: PodcastsAction.GET_SINGLE_PODCAST_ERROR,
})

export const getSinglePodcastSuccess = (
  options: IGetSinglePodcastOptions,
  podcast: IPodcast
): IGetSinglePodcastSuccessAction => ({
  options,
  podcast,
  type: PodcastsAction.GET_SINGLE_PODCAST_SUCCESS,
})

export const getPodcast: ActionCreator<any> = (options: IGetSinglePodcastOptions) => {
  return async (dispatch: Dispatch<AnyAction>): Promise<void> => {
    dispatch(getSinglePodcastPending(options))

    try {
      const response: AxiosResponse<IItemResponse<IPodcast>> = await api.get(
        '/podcasts/' + options.podcastSlug
      )

      dispatch(getSinglePodcastSuccess(options, response.data.item))
    } catch (err) {
      dispatch(getSinglePodcastError(options, err.message))
    }
  }
}
