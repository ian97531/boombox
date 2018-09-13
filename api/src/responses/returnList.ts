import { IStatement } from '@boombox/shared/types/models'
import { IStatementListResponse } from '@boombox/shared/types/responses'
import { Response } from 'express'
import { IListRequest } from '../types/requests'

export function returnStatements(req: IListRequest<IStatement>, res: Response) {
  const response: IStatementListResponse = {
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
