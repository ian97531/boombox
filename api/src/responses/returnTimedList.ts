import { Response } from 'express'
import { IStatementListRequest } from '../types/requests'
import { IStatementListResponse } from '../types/responses'

export default function(req: IStatementListRequest, res: Response) {
  const response: IStatementListResponse = {
    info: {
      moreResults: req.moreResults || false,
      numResults: req.items ? req.items.length : 0,
      pageSize: req.query.pageSize,
      startTime: req.query.startTime,
      statusCode: 200,
    },
    response: req.items,
  }

  res.json(response)
}
