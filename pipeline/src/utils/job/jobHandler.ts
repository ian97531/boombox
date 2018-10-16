import { Lambda } from '../lambda/Lambda'
import { lambdaCaller, lambdaHandler } from '../lambda/lambdaHandler'
import { getJob, putJob } from './db'
import { Job } from './Job'

interface IJobMessage<T> {
  job: string
  message: T
}

const jobCall: { [key: string]: boolean } = {}

const jobHandlerFunction = <Input>(
  func: (request: Lambda, job: Job, message: Input) => Promise<void>
) => {
  return async (lambda: Lambda, input: IJobMessage<Input>): Promise<void> => {
    lambda.log('jobHandler: Received event: ', input)
    const job = new Job(lambda, await getJob(input.job))
    const jobName = job.getName()

    if (jobCall[jobName]) {
      delete jobCall[jobName]
    }

    try {
      await job.log('jobHandler: Calling function handler...')
      await func(lambda, job, input.message)
      await job.log('jobHandler: Function handler complete.')
      if (!jobCall[jobName]) {
        await putJob(job.getJob())
      }
    } catch (error) {
      await job.completeWithError(error)
    }
  }
}

export const jobHandler = <Input>(
  func: (lambda: Lambda, job: Job, message: Input) => Promise<void>
) => {
  return lambdaHandler(jobHandlerFunction<Input>(func))
}

export const jobCaller = <Output>(queueName: string) => {
  return (lambda: Lambda, job: Job, message: Output, delay: number = 0) => {
    if (jobCall[job.getName()]) {
      throw Error('You may only call one lambda function from your handler.')
    }
    jobCall[job.getName()] = true

    lambda.addOnCompleteHandler(async () => {
      await job.log(`jobCaller: Starting ${queueName} in ${delay} seconds.`)
      await putJob(job.getJob())
      const jobMessage: IJobMessage<Output> = {
        job: job.getName(),
        message,
      }
      await lambdaCaller(queueName)(lambda, jobMessage, delay)
    })
  }
}
