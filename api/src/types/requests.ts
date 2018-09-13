import { Request } from 'express'

export interface IListRequest<RequestObject> extends Request {
  nextItem?: number
  totalItems: number
  items: RequestObject[]
  query: IListRequestQueryParams
}

export interface IListRequestQueryParams {
  start?: number
  pageSize?: number
}
