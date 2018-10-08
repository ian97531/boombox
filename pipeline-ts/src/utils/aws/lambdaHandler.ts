import { Callback, Context, SQSEvent } from 'aws-lambda'
import { ILambdaRequest } from '../../types/lambda'
import { getNextQueue, getRetryQueue } from '../environment'
import { logError, logStatus } from '../status'
import { LambdaRequestController } from './LambdaRequestController'
import { sendSQSMessage } from './sqs'

const wrapUp = async <Input, Output>(
  controllers: Array<LambdaRequestController<Input, Output>>,
  timedOut: boolean = false
) => {
  const retryQueue = getRetryQueue()

  for (const controller of controllers) {
    if (!timedOut) {
      if (controller.retry) {
        logStatus('Calling the retry() handler.')
        await sendSQSMessage(controller.input, retryQueue, controller.retryDelay)
      } else {
        logStatus('Calling the next() handler.')
        const nextQueue = getNextQueue()
        for (const output of controller.nextMessages) {
          await sendSQSMessage(output.message, nextQueue, output.delay)
        }
      }
    }
  }
}

// A handler that makes it easy to transform the various incoming and outgoing events AWS events
// to simplify the logic handlers.
export const lambdaHandler = <Input, Output>(
  func: (lambda?: ILambdaRequest<Input, Output>) => Promise<void>,
  timeoutBuffer: number = 100
) => {
  return async (event: SQSEvent, context: Context, callback: Callback): Promise<void> => {
    logStatus('Received Event: ', event)

    const controllers: Array<LambdaRequestController<Input, Output>> = []
    let timedOut = false

    const timer = setTimeout(async () => {
      timedOut = true
      logStatus('This lambda will timeout in ' + timeoutBuffer + ' milliseconds.')
      try {
        await wrapUp(controllers, true)
      } catch (error) {
        logError('Error executing the lambdaHandler timeout callback.', error)
      }
      callback()
    }, context.getRemainingTimeInMillis() - timeoutBuffer)

    try {
      if (event.Records.length) {
        for (const record of event.Records) {
          if (!timedOut) {
            const input = JSON.parse(record.body) as Input
            const controller = new LambdaRequestController<Input, Output>(input)
            controllers.push(controller)
            logStatus('Starting handler.')
            await func(controller.getRequest())
            logStatus('Completed handler.')
          }
        }
        if (!timedOut) {
          await wrapUp(controllers)
        }
      } else {
        logStatus('Skipping the handler because no records were found in the SQS event body.')
      }
    } catch (error) {
      logError('Error executing lambdaHandler.', error)
    }

    clearTimeout(timer)
    callback()
  }
}
