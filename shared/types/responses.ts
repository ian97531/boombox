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

export interface IItemResponse<ResponseObject> extends IResponseBase<IInfo, ResponseObject> {
  item: ResponseObject
}

export interface IListResponse<ResponseObject> extends IResponseBase<IListInfo, ResponseObject[]> {
  items: ResponseObject[]
}

export interface IErrorResponse extends IResponseBase<IErrorInfo, null> {}
