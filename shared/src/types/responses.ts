interface IResponseBase<Info> {
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
  nextItem?: number | string
  totalItems: number
  start: number
}

export interface IItemResponse<ResponseObject> extends IResponseBase<IInfo> {
  item: ResponseObject
}

export interface IListResponse<ResponseObject> extends IResponseBase<IListInfo> {
  items: ResponseObject[]
}

export interface IErrorResponse extends IResponseBase<IErrorInfo> {}
