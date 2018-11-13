import { Request } from 'express'

export interface IListRequest<T> extends Request {
  nextItem?: string | number
  totalItems: number
  items: T[]
  query: IListRequestQueryParams
}

export interface IListRequestQueryParams {
  start: number
  pageSize: number
}

export interface IItemRequest<T> extends Request {
  item: T
}
