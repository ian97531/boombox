import { getEpisode } from '@boombox/shared/src/db/episodes'
import { getJob, putJob } from '@boombox/shared/src/db/jobs'
import { IEpisode } from '@boombox/shared/src/types/models/episode'
import { IJob, IJobStatusUpdate, JOB_STATUS } from '@boombox/shared/src/types/models/job'
import { ENV } from '../constants'
import { IJobInput, IJobMessage } from '../types/jobs'
import { NextFunction, RetryFunction } from '../types/lambdas'
import { baseHandler } from './lambda'
import { logError, logStatus } from './status'

export const jobError = (message: string, job: IJob, options?: { error?: Error; obj?: any }) => {
  return logError(
    `Error encountered in job ${job.startTime} for ${job.podcastSlug} ${
      job.episodeSlug
    }: ${message}`,
    options
  )
}

export const jobStatus = (message: string, job: IJob, obj?: any) => {
  logStatus(`Job ${job.startTime} for ${job.podcastSlug} ${job.episodeSlug}: ${message}`, obj)
}

export const createJobMessage = <T>(job: IJob, message: T): IJobMessage<T> => {
  return {
    job: job.startTime.toISOString(),
    message,
  }
}

export const startJob = async (job: IJob) => {
  const lambdaName = process.env[ENV.AWS_LAMBDA_FUNCTION_NAME]
  if (lambdaName !== undefined) {
    try {
      job.lambdas[lambdaName] = {
        startTime: new Date().toISOString(),
        status: JOB_STATUS.PROCESSING,
      }
      await putJob(job)
    } catch (error) {
      jobError('Error starting job.', job, { error })
    }
  } else {
    logError('The environment variable AWS_LAMBDA_FUNCTION_NAME is undefined')
  }
}

export const updateJob = async (job: IJob, update: IJobStatusUpdate) => {
  const lambdaName = process.env[ENV.AWS_LAMBDA_FUNCTION_NAME]
  if (lambdaName !== undefined) {
    try {
      job.lambdas[lambdaName] = {
        ...job.lambdas[lambdaName],
        ...update,
      }
      await putJob(job)
    } catch (error) {
      jobError('Error updating job.', job, { error })
    }
  } else {
    logError('The environment variable AWS_LAMBDA_FUNCTION_NAME is undefined')
  }
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
    const episode: IEpisode = await getEpisode(job.podcastSlug, job.publishTimestamp)

    const nextMessages: Output[] = []
    const nextWrapper = (nextMessage: Output) => {
      nextMessages.push(nextMessage)
    }

    let retryMessage
    let callRetry = false
    const retryWrapper = (logMessage: string) => {
      callRetry = true
      retryMessage = logMessage
    }

    try {
      await startJob(job)
      await func({ episode, job, message: message.message }, nextWrapper, retryWrapper)
    } catch (error) {
      jobError('Error executing job handler', job, { error })
      await updateJob(job, {
        endTime: new Date().toISOString(),
        error: error.message,
        status: JOB_STATUS.ERROR,
      })
      throw error
    }

    if (callRetry) {
      await updateJob(job, { status: JOB_STATUS.RETRYING })
      retry(retryMessage)
    } else {
      jobStatus('Completed job.', job)
      await updateJob(job, {
        endTime: new Date().toISOString(),
        output: nextMessages,
        status: JOB_STATUS.COMPLETED,
      })

      for (const nextMessage of nextMessages) {
        await next(createJobMessage(job, nextMessage))
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
    const episodes: IEpisode[] = []
    const nextWrapper = (message: IEpisode) => {
      episodes.push(message)
    }

    let callRetry = false
    let retryMessage
    const retryWrapper = (logMessage: string) => {
      callRetry = true
      retryMessage = logMessage
    }

    try {
      await func(nextWrapper, retryWrapper)
    } catch (error) {
      logError('Error starting job.', error)
    }

    if (callRetry) {
      retry(retryMessage)
    } else {
      for (const episode of episodes) {
        const job: IJob = {
          episodeSlug: episode.slug,
          info: {},
          lambdas: {},
          podcastSlug: episode.podcastSlug,
          publishTimestamp: episode.publishTimestamp,
          startTime: new Date(),
          status: JOB_STATUS.PROCESSING,
        }
        await putJob(job)
        await next(createJobMessage(job, episode))
        jobStatus('Created job', job)
      }
    }
  }
}

export const startJobLambda = (
  func: (next?: NextFunction<IEpisode>, retry?: RetryFunction) => Promise<void>
) => {
  return baseHandler(createJobHandler(func))
}

export const jobLambda = <Input, Output>(
  func: (
    input?: IJobInput<Input>,
    next?: NextFunction<Output>,
    retry?: RetryFunction
  ) => Promise<void>
) => {
  return baseHandler(jobHanlder<Input, Output>(func))
}
