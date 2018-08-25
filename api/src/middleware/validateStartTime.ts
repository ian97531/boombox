import { NextFunction, Request, Response } from 'express'
import validator = require('validator')
import { BadRequest } from '../errors'

export default function(defaultStartTime = 0) {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = req.query.startTime
    if (startTime && !validator.isFloat(startTime, { min: 0 })) {
      return next(
        new BadRequest('startTime must be a number greater than or equal to 0.')
      )
    }

    if (startTime === undefined) {
      req.query.startTime = defaultStartTime
    } else {
      req.query.startTime = parseFloat(req.query.startTime)
    }

    next()
  }
}
