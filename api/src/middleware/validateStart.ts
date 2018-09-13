import { NextFunction, Request, Response } from 'express'
import validator = require('validator')
import { BadRequest } from '../errors'

export default function(defaultStart = 0) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = req.query.start
    if (start && !validator.isFloat(start, { min: 0 })) {
      return next(new BadRequest('start must be a number greater than or equal to 0.'))
    }

    if (start === undefined) {
      req.query.start = defaultStart
    } else {
      req.query.start = parseFloat(req.query.start)
    }

    next()
  }
}
