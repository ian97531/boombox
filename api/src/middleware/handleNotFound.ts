import { NotFound } from 'errors'
import { NextFunction, Request, Response } from 'express'

export default function(req: Request, res: Response, next: NextFunction) {
  return next(new NotFound())
}
