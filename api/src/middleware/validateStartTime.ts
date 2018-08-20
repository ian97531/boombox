import { NextFunction, Request, Response } from 'express'
import validator = require('validator')
import { BadRequest } from '../errors'

export default function(defaultStartTime = 0) {
  console.log('in start time wrapper')
  return (req: Request, res: Response, next: NextFunction) => {
    console.log('in start time validator')
    const startTime = req.query.startTime
    if (startTime && !validator.isInt(startTime, { min: 0 })) {
      return next(
        new BadRequest(
          'startTime must be an integer greater than or equal to 0.'
        )
      )
    }

    if (startTime === undefined) {
      req.query.startTime = defaultStartTime
    }

    next()
  }
}
