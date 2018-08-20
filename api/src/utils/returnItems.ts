import { Response } from 'express'
import IRequest from '../types/IRequest'

export default function(req: IRequest, res: Response) {
  console.log('in return items')
  const response = {
    info: {
      ...req.params,
      ...req.query,
      hasMore: req.hasMore || false,
      results: req.items ? req.items.length : 0,
    },
    response: req.items,
  }

  res.json(response)
}
