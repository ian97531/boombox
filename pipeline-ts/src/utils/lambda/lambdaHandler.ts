import { Callback, Context, SQSEvent } from 'aws-lambda'
import { sendSQSMessage } from '../aws/sqs'
import { Lambda, LambdaCallback } from './Lambda'

const callHandlers = async (handlers: LambdaCallback[]) => {
  for (const handler of handlers) {
    await handler()
  }
}

// A handler that makes it easy to transform the various incoming and outgoing events AWS events
// to simplify the logic handlers.
export const lambdaHandler = <Input>(
  func: (lambda?: Lambda, input?: Input) => Promise<void>,
  timeoutBuffer: number = 100
) => {
  return async (event: SQSEvent, context: Context, callback: Callback): Promise<void> => {
    const lambda: Lambda = new Lambda(context)
    let timedOut = false

    lambda.log('lambdaHandler: Received Event: ', event)

    const timer = setTimeout(async () => {
      timedOut = true
      lambda.log('lambdaHandler: This lambda will timeout in ' + timeoutBuffer + ' milliseconds.')
      try {
        await callHandlers(lambda.onTimeoutHandlers)
        lambda.log('lambdaHandler: Completed onTimeout callbacks.')
        await callHandlers(lambda.onCompleteHandlers)
        lambda.log('lambdaHandler: Completed onComplete callbacks.')
      } catch (error) {
        lambda.logError('lambdaHandler: Error executing a timeout callback.', error)
      }
      callback()
    }, context.getRemainingTimeInMillis() - timeoutBuffer)

    try {
      if (event.Records.length) {
        for (const record of event.Records) {
          if (!timedOut) {
            const input = JSON.parse(record.body) as Input
            lambda.log('lambdaHanlder: Calling function handler.')
            await func(lambda, input)
            lambda.log('lambdaHandler: Completed function handler.')
            await callHandlers(lambda.onCompleteHandlers)
            lambda.log('lambdaHandler: Completed onComplete callbacks.')
          }
        }
      } else {
        lambda.log(
          'lamdbaHandler: Skipping the handler because no records were found in the SQS event body.'
        )
      }
    } catch (error) {
      lambda.logError('lambdaHandler: An exception was encountered.', error)
    }

    clearTimeout(timer)
    callback()
  }
}

export const lambdaCaller = <Output>(queueName: string) => {
  return async (lambda: Lambda, message: Output, delay: number = 0) => {
    const queue = Lambda.getEnvVariable(queueName) as string
    await sendSQSMessage(message, queue, delay)
  }
}
