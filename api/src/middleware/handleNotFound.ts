import { NextFunction, Request, Response } from 'express'
import { NotFound } from '../errors'

export default function(req: Request, res: Response, next: NextFunction) {
  return next(new NotFound())
}
