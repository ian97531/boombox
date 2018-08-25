import AWS = require('aws-sdk')
import { NextFunction, Request, Response } from 'express'
import { IError } from '../types/error'
import { IErrorResponse } from '../types/responses'

const EXCLUDE_ENV = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SECURITY_TOKEN',
  'AWS_SESSION_TOKEN',
  'AWS_XRAY_CONTEXT_MISSING',
  'AWS_XRAY_DAEMON_ADDRESS',
  'LAMBDA_RUNTIME_DIR',
  'LAMBDA_TASK_ROOT',
  'LD_LIBRARY_PATH',
  '_AWS_XRAY_DAEMON_ADDRESS',
  '_AWS_XRAY_DAEMON_PORT',
  '_X_AMZN_TRACE_ID',
]

function sendErrorSNS(error: IError, req: any) {
  AWS.config.update({
    region: 'us-east-1',
  })
  const sns = new AWS.SNS()

  // Gather the relavent environment variables.
  const environmentVariables = {}
  Object.keys(process.env).map(envVar => {
    if (EXCLUDE_ENV.indexOf(envVar) === -1) {
      environmentVariables[envVar] = process.env[envVar]
    }
  })

  // Construct the SNS message.
  const snsMessage = {
    environment: environmentVariables,
    error: {
      error_message: error.message,
      error_type: error.name,
      traceback: error.stack,
    },
    invoking_event: req.event,
  }
  const params: AWS.SNS.PublishInput = {
    Message: JSON.stringify(snsMessage, undefined, 2),
    Subject: 'API ' + error.name + ': ' + error.message,
    TopicArn: process.env.ERROR_TOPIC,
  }

  // Send the message.
  sns.publish(params, (err, data) => {
    if (err) {
      console.error('Unable to send error to SNS.')
      console.error(err)
    }
  })
}

export default function(
  error: IError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const status = error.status || 500
  const title = error.title || 'Uknown Error'
  let message = error.message || ''

  if (status === 500) {
    // Log the error and forward it off the API errors SNS topic.
    console.log(title + ': ' + message)
    console.error(error.stack)
    sendErrorSNS(error, req)

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
    response: null,
    // tslint:enable:object-literal-sort-keys
  }

  res.status(status).json(response)
}
