import { NextFunction, Request, Response } from 'express'
import * as validator from 'validator'
import { BadRequest } from '../errors'

export default function(defaultPageSize = 50) {
  return (req: Request, res: Response, next: NextFunction) => {
    const pageSize = req.query.pageSize
    if (pageSize && !validator.isInt(pageSize, { min: 1, max: 100 })) {
      return next(new BadRequest('pageSize must be an integer greater than 0 and less than 100.'))
    }

    if (pageSize === undefined) {
      req.query.pageSize = defaultPageSize
    } else {
      req.query.pageSize = parseInt(req.query.pageSize, 10)
    }

    next()
  }
}
