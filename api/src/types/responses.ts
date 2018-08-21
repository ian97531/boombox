import { IEpisode, IPodcast, IStatement } from './models'

interface IResponseBase<Info, Response> {
  info: Info
  response: Response
}

interface IInfo {
  statusCode: number
}

interface IListInfoBase extends IInfo {
  pageSize: number
  numResults: number
  moreResults: boolean
}

interface IListInfo extends IListInfoBase {
  pageSize: number
}

interface ITimedListInfo extends IListInfoBase {
  startTime: number
}

interface IResponse<ResponseObject>
  extends IResponseBase<IInfo, ResponseObject> {}

interface IListResponse<ResponseObject>
  extends IResponseBase<IListInfo, ResponseObject[]> {}

interface ITimedListReponse<ResponseObject>
  extends IResponseBase<ITimedListInfo, ResponseObject[]> {}

export interface IEpisodeListResponse extends IListResponse<IEpisode> {}
export interface IEpisodeResponse extends IResponse<IEpisode> {}
export interface IPodcastListResponse extends IListResponse<IPodcast> {}
export interface IPodcastResponse extends IResponse<IPodcast> {}
export interface IStatementListResponse extends ITimedListReponse<IStatement> {}
