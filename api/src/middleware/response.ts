import { IItemResponse, IListResponse } from '@boombox/shared'
import { Response } from 'express'
import { IItemRequest, IListRequest } from '../types/requests'

export function returnList<T>(req: IListRequest<T>, res: Response) {
  const response: IListResponse<T> = {
    info: {
      numItems: req.items ? req.items.length : 0,
      pageSize: req.query.pageSize as number,
      start: req.query.start as number,
      statusCode: 200,
      totalItems: req.totalItems,
    },
    items: req.items,
  }
  if (req.nextItem) {
    response.info.nextItem = req.nextItem
  }
  res.json(response)
}

export function returnItem<T>(req: IItemRequest<T>, res: Response) {
  const response: IItemResponse<T> = {
    info: {
      statusCode: 200,
    },
    item: req.item,
  }

  res.json(response)
}
