import { NextFunction, Request, Response } from 'express'
import IError from '../types/IError'

function defaultHandler(error: IError) {
  const status = error.status || 500
  const title = error.title || 'Uknown Error'
  let detail = error.message || ''

  if (status === 500) {
    console.error(error.stack)
    detail = 'Internal Server Error'
  }

  return { status, title, detail }
}

export default function(
  error: IError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { status, title, detail } = defaultHandler(error)

  res.status(status).json({
    status,
    title,
    // tslint:disable-next-line:object-literal-sort-keys
    detail,
  })
}
