import { getEpisode } from '@boombox/shared/src/db/episodes'
import { getJob, putJob } from '@boombox/shared/src/db/jobs'
import { IEpisode } from '@boombox/shared/src/types/models/episode'
import { IJob, IJobStatusUpdate, JOB_STATUS } from '@boombox/shared/src/types/models/job'
import { IJobInput, IJobMessage } from '../types/jobs'
import { NextFunction, RetryFunction, TimeoutCallback } from '../types/lambdas'
import { baseHandler } from './aws/lambda'
import { getLambdaFunctionName } from './environment'

export const createJobMessage = <T>(job: IJob, message: T): IJobMessage<T> => {
  return {
    job: job.startTime.toISOString(),
    message,
  }
}

export const startJob = async (job: IJob) => {
  const lambdaName = getLambdaFunctionName()
  job.lambdas[lambdaName] = {
    startTime: new Date().toISOString(),
    status: JOB_STATUS.PROCESSING,
  }
  await putJob(job)
}

export const updateJob = async (job: IJob, update: IJobStatusUpdate) => {
  const lambdaName = getLambdaFunctionName()
  job.lambdas[lambdaName] = {
    ...job.lambdas[lambdaName],
    ...update,
  }
  await putJob(job)
}

const jobHanlder = <Input, Output>(
  func: (
    input?: IJobInput<Input>,
    next?: NextFunction<Output>,
    retry?: RetryFunction
  ) => Promise<void>
) => {
  return async (
    message: IJobMessage<Input>,
    next: NextFunction<IJobMessage<Output>>,
    retry: RetryFunction
  ): Promise<void> => {
    const job: IJob = await getJob(message.job)
    const publishedAtKey = new Date(job.publishedAt)
    const episode: IEpisode = await getEpisode(job.podcastSlug, publishedAtKey)

    const nextMessages: Array<{ delay: number; message: Output }> = []
    const nextWrapper = (nextMessage: Output, delay: number) => {
      nextMessages.push({ delay, message: nextMessage })
    }

    let retryDelay
    let callRetry = false
    const retryWrapper = (delaySeconds: number = 60) => {
      callRetry = true
      retryDelay = delaySeconds
    }

    try {
      await startJob(job)
      await func({ episode, job, message: message.message }, nextWrapper, retryWrapper)
    } catch (error) {
      console.log('Error executing job handler: ', error)
      await updateJob(job, {
        endTime: new Date().toISOString(),
        error: error.message,
        status: JOB_STATUS.ERROR,
      })
      throw error
    }

    if (callRetry) {
      await updateJob(job, { status: JOB_STATUS.RETRYING })
      retry(retryDelay)
    } else {
      await updateJob(job, {
        endTime: new Date().toISOString(),
        output: nextMessages,
        status: JOB_STATUS.COMPLETED,
      })

      for (const nextMessage of nextMessages) {
        await next(createJobMessage(job, nextMessage.message), nextMessage.delay)
      }
    }
  }
}

export const createJobHandler = (
  func: (next?: NextFunction<IEpisode>, retry?: RetryFunction) => Promise<void>
) => {
  return async (
    event: any,
    next: NextFunction<IJobMessage<IEpisode>>,
    retry: RetryFunction
  ): Promise<void> => {
    const nextMessages: Array<{ delay: number; message: IEpisode }> = []
    const nextWrapper = (message: IEpisode, delay: number) => {
      nextMessages.push({ delay, message })
    }

    let retryDelay
    let callRetry = false
    const retryWrapper = (delaySeconds: number = 60) => {
      callRetry = true
      retryDelay = delaySeconds
    }

    try {
      await func(nextWrapper, retryWrapper)
    } catch (error) {
      console.log('Error executing job handler: ', error)
      throw error
    }

    if (callRetry) {
      retry(retryDelay)
    } else {
      for (const nextMessage of nextMessages) {
        const job: IJob = {
          episodeSlug: nextMessage.message.slug,
          info: {},
          lambdas: {},
          podcastSlug: nextMessage.message.podcastSlug,
          publishedAt: nextMessage.message.publishedAt,
          startTime: new Date(),
          status: JOB_STATUS.PROCESSING,
        }
        await putJob(job)
        await next(createJobMessage(job, nextMessage.message), nextMessage.delay)
      }
    }
  }
}

export const startJobLambda = (
  func: (next?: NextFunction<IEpisode>, retry?: RetryFunction) => Promise<void>,
  timeoutCallback?: TimeoutCallback
) => {
  return baseHandler(createJobHandler(func), timeoutCallback)
}

export const jobLambda = <Input, Output>(
  func: (
    input?: IJobInput<Input>,
    next?: NextFunction<Output>,
    retry?: RetryFunction
  ) => Promise<void>,
  timeoutCallback?: TimeoutCallback
) => {
  return baseHandler(jobHanlder<Input, Output>(func), timeoutCallback)
}
