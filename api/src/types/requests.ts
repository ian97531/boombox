import { Request } from 'express'

export interface IListRequest extends Request {
  nextItem?: number
  totalItems: number
  items: any[]
  query: IListRequestQueryParams
}

export interface IListRequestQueryParams {
  start: number
  pageSize: number
}

export interface IItemRequest extends Request {
  item: any
}
