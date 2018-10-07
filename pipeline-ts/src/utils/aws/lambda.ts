import { Callback, Context, SQSEvent } from 'aws-lambda'
import * as AWS from 'aws-sdk'
import { NextFunction, RetryFunction, TimeoutCallback } from '../../types/lambdas'
import { getNextQueue, getRetryQueue } from '../environment'
import { logError, logStatus } from '../status'

const sqs = new AWS.SQS()

export const sendSQSMessage = async <T>(message: T, QueueUrl: string, DelaySeconds: number = 0) => {
  if (DelaySeconds) {
    logStatus(
      `Sending message with a ${DelaySeconds} second delay to ${QueueUrl} with payload`,
      message
    )
  } else {
    logStatus(`Sending message with no delay to ${QueueUrl} with payload`, message)
  }

  const params: AWS.SQS.SendMessageRequest = {
    DelaySeconds,
    MessageBody: JSON.stringify(message || {}),
    QueueUrl,
  }
  await sqs.sendMessage(params).promise()
}

const retryLambda = async (event: SQSEvent, DelaySeconds: number = 0) => {
  const retryQueue = getRetryQueue()
  for (const record of event.Records) {
    await sendSQSMessage(JSON.parse(record.body), retryQueue, DelaySeconds)
  }
}
// A handler that makes it easy to transform the various incoming and outgoing events AWS events
// to simplify the logic handlers.
export const baseHandler = <Input, Output>(
  func: (input?: Input, next?: NextFunction<Output>, retry?: RetryFunction) => Promise<void>,
  timeoutCallback?: TimeoutCallback
) => {
  return async (event: SQSEvent, context: Context, callback: Callback): Promise<void> => {
    // Log a warning 500 milliseconds before the lambda times out. Call the callback to prevent
    // the lambda from being re-executed.

    let retryDelay = 60
    let callRetry = false
    const retryWrapper = (delaySeconds: number = 0) => {
      callRetry = true
      retryDelay = delaySeconds
    }

    const buffer = 500
    const timer = setTimeout(async () => {
      logStatus('This lambda will timeout in ' + buffer + ' milliseconds.')
      if (timeoutCallback) {
        try {
          await timeoutCallback(retryWrapper)
          callback()
        } catch (error) {
          logError('Error executing the lambda timeout callback.', { error })
          console.error(`Error Name: ${error.name}`)
          console.error(`Error Message: ${error.message}`)
          if (error.stack) {
            console.error(`Error Stack: ${error.stack}`)
          }
          callback(error)
        } finally {
          if (callRetry) {
            await retryLambda(event, retryDelay)
          }
        }
      } else {
        callback()
      }
    }, context.getRemainingTimeInMillis() - buffer)

    logStatus('Received Event: ', event)

    try {
      const nextMessages: Array<{ delay: number; message: Output }> = []
      const nextWrapper = (message: Output, delay: number = 0) => {
        nextMessages.push({ delay, message })
      }

      if (event.Records.length) {
        for (const record of event.Records) {
          const input = JSON.parse(record.body) as Input
          logStatus('Starting handler.')
          await func(input, nextWrapper, retryWrapper)
          logStatus('Completed handler.')
        }
      } else {
        logStatus('Skipping the handler because no records were found in the SQS event body.')
      }

      if (nextMessages.length) {
        logStatus('Calling the next() handler.')
        const QueueUrl = getNextQueue()
        for (const output of nextMessages) {
          await sendSQSMessage(output.message, QueueUrl, output.delay)
        }
      } else {
        logStatus('No calls ot next() were found.')
      }
    } catch (error) {
      logError('Error executing handler.', { error })
      if (error) {
        console.error(`Error Name: ${error.name}`)
        console.error(`Error Message: ${error.message}`)
        if (error.stack) {
          console.error(`Error Stack: ${error.stack}`)
        }
      } else {
        console.error('No error object was provided.')
      }
    }

    if (callRetry) {
      logStatus('Calling the retry() handler.')
      await retryLambda(event, retryDelay)
    }

    clearTimeout(timer)
  }
}
