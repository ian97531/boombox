import { Callback, Context, SQSEvent } from 'aws-lambda'
import * as AWS from 'aws-sdk'
import { ENV } from '../constants'
import { NextFunction, RetryFunction } from '../types/lambdas'
import { logError, logStatus } from './status'

const sqs = new AWS.SQS()

export const sendSQSMessage = async <T>(message: T, QueueUrl: string) => {
  const params: AWS.SQS.SendMessageRequest = {
    MessageBody: JSON.stringify(message || {}),
    QueueUrl,
  }
  await sqs.sendMessage(params).promise()
}
// A handler that makes it easy to transform the various incoming and outgoing events AWS events
// to simplify the logic handlers.
export const baseHandler = <Input, Output>(
  func: (input?: Input, next?: NextFunction<Output>, retry?: RetryFunction) => Promise<void>
) => {
  return async (event: SQSEvent, context: Context, callback: Callback): Promise<void> => {
    // Log a warning 100 milliseconds before the lambda times out. Call the callback to prevent
    // the lambda from being re-executed.
    const buffer = 100
    const timer = setTimeout(() => {
      logStatus('This lambda will timeout in ' + buffer + ' milliseconds.')
      callback()
    }, context.getRemainingTimeInMillis() - buffer)

    logStatus('Received Event: ', event)

    let retryMessage
    let callRetry = false
    const retryWrapper = (logMessage?: string) => {
      callRetry = true
      retryMessage = logMessage
    }

    try {
      const nextMessages: Output[] = []
      const nextWrapper = (nextMessage: Output) => {
        nextMessages.push(nextMessage)
      }

      for (const record of event.Records) {
        const input = JSON.parse(record.body) as Input
        await func(input, nextWrapper, retryWrapper)
      }

      const QueueUrl = process.env[ENV.NEXT_QUEUE]
      if (QueueUrl !== undefined) {
        for (const output of nextMessages) {
          await sendSQSMessage(output, QueueUrl)
        }
      }
    } catch (error) {
      logError('Error executing handler.')
      logError(`Error Name: ${error.name}`)
      logError(`Error Message: ${error.message}`)
      if (error.stack) {
        logError(`Error Stack: ${error.stack}`)
      }
    }

    if (callRetry) {
      let errorMessage = 'Retrying Lambda'
      if (retryMessage) {
        errorMessage = `${errorMessage}: ${retryMessage}`
      }
      throw Error(errorMessage)
    }

    clearTimeout(timer)
  }
}
