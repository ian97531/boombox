import { NextFunction, Request, Response } from 'express'
import validator = require('validator')
import { BadRequest } from '../errors'

export default function(defaultPageSize = 50) {
  console.log('in page size wrapper')
  return (req: Request, res: Response, next: NextFunction) => {
    console.log('in page size validator')
    const pageSize = req.query.pageSize
    if (pageSize && !validator.isInt(pageSize, { min: 1, max: 100 })) {
      return next(
        new BadRequest(
          'pageSize must be an integer greater than 0 and less than 100.'
        )
      )
    }

    if (pageSize === undefined) {
      req.query.pageSize = defaultPageSize
    }

    next()
  }
}
