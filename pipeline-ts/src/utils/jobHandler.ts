import { IJobMessage, IJobRequest } from '@boombox/shared/src/types/models/job'
import { ILambdaRequest } from '../types/lambda'
import { lambdaHandler } from './aws/lambdaHandler'
import { LambdaRequestController } from './aws/LambdaRequestController'
import { getJobController } from './JobController'

const jobHandlerFunction = <Input, Output>(
  func: (request: ILambdaRequest<Input, Output>, job: IJobRequest) => Promise<void>
) => {
  return async (
    request: ILambdaRequest<IJobMessage<Input>, IJobMessage<Output | undefined>>
  ): Promise<void> => {
    const job = await getJobController(request.input.job, request)
    const lambda = new LambdaRequestController<Input, Output>(request.input.message)

    try {
      await func(lambda.getRequest(), job.getRequest())
      if (lambda.retry) {
        await job.logRetrying()
        request.retryFunction(lambda.retryDelay)
      } else {
        await job.logCompleted(lambda.nextMessages)
        for (const nextMessage of lambda.nextMessages) {
          request.nextFunction(job.createJobMessage(nextMessage.message), nextMessage.delay)
        }
      }
    } catch (error) {
      job.logError('Error executing job handler.', error)
      throw error
    }
  }
}

export const jobHandler = <Input, Output>(
  func: (lambda: ILambdaRequest<Input, Output>, job: IJobRequest) => Promise<void>
) => {
  return lambdaHandler(jobHandlerFunction<Input, Output>(func))
}
