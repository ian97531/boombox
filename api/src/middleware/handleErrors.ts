import { NextFunction, Request, Response } from 'express'
import { IError } from '../types/error'
import { IErrorResponse } from '../types/responses'

function defaultHandler(error: IError) {
  const status = error.status || 500
  const title = error.title || 'Uknown Error'
  let message = error.message || ''

  if (status === 500) {
    console.error(error.stack)
    message = 'Internal Server Error'
  }

  return { status, title, message }
}

export default function(
  error: IError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { status, title, message } = defaultHandler(error)

  const response: IErrorResponse = {
    // tslint:disable:object-literal-sort-keys
    info: {
      statusCode: status,
      error: title,
      message,
    },
    response: null,
    // tslint:enable:object-literal-sort-keys
  }

  res.status(status).json(response)
}
