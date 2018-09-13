import { IEpisode, IPodcast, IStatement } from './models'

interface IResponseBase<Info, Response> {
  info: Info
}

interface IInfo {
  statusCode: number
}

interface IErrorInfo extends IInfo {
  error: string
  message: string
}

interface IListInfo extends IInfo {
  pageSize: number
  numItems: number
  nextItem?: number
  totalItems: number
  start: number
}

interface IResponse<ResponseObject> extends IResponseBase<IInfo, ResponseObject> {
  item: ResponseObject
}

interface IListResponse<ResponseObject> extends IResponseBase<IListInfo, ResponseObject[]> {
  items: ResponseObject[]
}

export interface IErrorResponse extends IResponseBase<IErrorInfo, null> {}
export interface IEpisodeListResponse extends IListResponse<IEpisode> {}
export interface IEpisodeResponse extends IResponse<IEpisode> {}
export interface IPodcastListResponse extends IListResponse<IPodcast> {}
export interface IPodcastResponse extends IResponse<IPodcast> {}
export interface IStatementListResponse extends IListResponse<IStatement> {}
