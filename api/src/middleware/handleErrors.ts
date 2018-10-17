import { IErrorResponse } from '@boombox/shared/src/types/responses'
import { NextFunction, Request, Response } from 'express'
import { IError } from '../types/error'

// const EXCLUDE_ENV = [
//   'AWS_ACCESS_KEY_ID',
//   'AWS_SECRET_ACCESS_KEY',
//   'AWS_SECURITY_TOKEN',
//   'AWS_SESSION_TOKEN',
//   'AWS_XRAY_CONTEXT_MISSING',
//   'AWS_XRAY_DAEMON_ADDRESS',
//   'LAMBDA_RUNTIME_DIR',
//   'LAMBDA_TASK_ROOT',
//   'LD_LIBRARY_PATH',
//   '_AWS_XRAY_DAEMON_ADDRESS',
//   '_AWS_XRAY_DAEMON_PORT',
//   '_X_AMZN_TRACE_ID',
// ]

export default function(error: IError, req: Request, res: Response, next: NextFunction) {
  const status = error.status || 500
  const title = error.title || 'Unknown Error'
  let message = error.message || ''

  if (status === 500) {
    // Log the error and forward it off the API errors SNS topic.
    console.log(title + ': ' + message)
    console.error(error.stack)

    // The user should just see the message:
    message = 'Internal Server Error'
  }

  const response: IErrorResponse = {
    // tslint:disable:object-literal-sort-keys
    info: {
      statusCode: status,
      error: title,
      message,
    },
    // tslint:enable:object-literal-sort-keys
  }

  res.status(status).json(response)
}
