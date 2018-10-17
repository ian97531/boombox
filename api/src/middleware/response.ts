import { IItemResponse, IListResponse } from '@boombox/shared/src/types/responses'
import { Response } from 'express'
import { IItemRequest, IListRequest } from '../types/requests'

export function returnList(req: IListRequest, res: Response) {
  const response: IListResponse<any> = {
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

export function returnItem(req: IItemRequest, res: Response) {
  const response: IItemResponse<any> = {
    info: {
      statusCode: 200,
    },
    item: req.item,
  }

  res.json(response)
}
