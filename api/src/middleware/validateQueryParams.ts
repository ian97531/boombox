import { NextFunction, Request, Response } from 'express'
import { BadRequest } from '../errors'

export default function(allowedQueryParams: string[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    const invalidQueryParams: string[] = []
    Object.keys(req.query).forEach(param => {
      if (allowedQueryParams.indexOf(param) === -1) {
        invalidQueryParams.push(param)
      }
    })

    if (invalidQueryParams.length > 0) {
      const plural = invalidQueryParams.length > 1
      const are = plural ? ' are ' : ' is an '
      const parameters = plural ? ' parameters.' : ' parameter.'
      return next(
        new BadRequest(invalidQueryParams.join(', ') + are + 'invalid query' + parameters)
      )
    }

    next()
  }
}
