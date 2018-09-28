import { getEpisode } from '@boombox/shared/src/db/episodes'
import { getJob, putJob } from '@boombox/shared/src/db/jobs'
import { IEpisode } from '@boombox/shared/src/types/models/episode'
import { IJob, JOB_STATUS } from '@boombox/shared/src/types/models/job'
import { Callback, Context, SNSEvent } from 'aws-lambda'
import * as AWS from 'aws-sdk'
import { ENV } from '../constants'

type NextAsyncFunction = (message: { job: string }) => Promise<void>
export type NextFunction<T> = (message: T) => void

const sns = new AWS.SNS()

// A base handler that will execute async functions, will warn of impending timeouts, and will
// handle errors correctly.
export function asyncHandler(
  func: (event?: any, env?: NodeJS.ProcessEnv, callback?: Callback) => Promise<void>
) {
  return (event: any, context: Context, callback: Callback) => {
    const buffer = 100
    const timer = setTimeout(() => {
      console.warn('This lambda will timeout in ' + buffer + ' milliseconds.')
    }, context.getRemainingTimeInMillis() - buffer)

    console.log('Received Event: ', JSON.stringify(event, null, 2))

    Promise.resolve(func(event, process.env, callback))
      .then(() => {
        clearTimeout(timer)
      })
      .catch(error => {
        console.error('Exception Thrown: ', error.message)
        callback(error)
        clearTimeout(timer)
        throw error
      })
  }
}

// A handler that makes it easy to transform the various incoming and outgoing events AWS events
// to simplify the logic handlers.
export const baseHandler = (
  func: (message?: any, env?: NodeJS.ProcessEnv, next?: NextAsyncFunction) => Promise<void>,
  options?: {
    input?: (event?: any, env?: NodeJS.ProcessEnv, next?: NextAsyncFunction) => Promise<void>
    output?: (event?: any, env?: NodeJS.ProcessEnv) => Promise<void>
  }
) => {
  return async (event: any, env: NodeJS.ProcessEnv, callback: Callback): Promise<void> => {
    const outputFunction = async (message?: any) => {
      if (options && options.output) {
        await options.output(message, env)
      }
    }

    const mainFunction = async (message?: any) => {
      await func(message, env, outputFunction)
    }

    if (options && options.input) {
      await options.input(event, env, mainFunction)
    } else {
      await func(event, env, outputFunction)
    }
  }
}

// Unwraps and parses incoming SNSEvents.
export const snsInput = async (
  event: SNSEvent,
  env: NodeJS.ProcessEnv,
  next: NextAsyncFunction
): Promise<void> => {
  for (const record of event.Records) {
    const message = JSON.parse(record.Sns.Message)
    console.log('Received SNS Message: ', JSON.stringify(message, null, 2))
    next(message)
  }
}

// Detects the presense of a COMPLETION_TOPIC environment variable, if found, the return value
// of the handler will be published to that SNS TOPIC.
export const snsOutput = async (message: any, env: NodeJS.ProcessEnv): Promise<void> => {
  const completionTopic = env[ENV.COMPLETION_TOPIC]
  if (completionTopic === undefined) {
    throw Error('The COMPLETION_TOPIC environement variable is not defined.')
  }

  const params = {
    Message: JSON.stringify(message),
    TopicArn: env.COMPLETION_TOPIC,
  }
  try {
    await sns.publish(params).promise()
    console.log('Successfully sent completion SNS message to: ', env.COMPLETION_TOPIC)
  } catch (error) {
    console.error('Failed to send completion SNS message to: ', env.COMPLETION_TOPIC)
    console.error('The unsent message contained: ', JSON.stringify(message, null, 2))
  }
}

export const jobHanlder = (
  func: (
    episode?: IEpisode,
    job?: IJob,
    message?: any,
    env?: NodeJS.ProcessEnv,
    next?: NextFunction
  ) => Promise<void>
) => {
  return async (message: any, env: NodeJS.ProcessEnv, next: NextAsyncFunction): Promise<void> => {
    const job: IJob = await getJob(message.job)
    const episode: IEpisode = await getEpisode(job.podcastSlug, job.publishTimestamp)
    const lambdaName = env[ENV.AWS_LAMBDA_FUNCTION_NAME]
    if (lambdaName === undefined) {
      throw Error('The AWS_LAMBDA_FUNCTION_NAME environement variable is not defined.')
    }

    console.log(
      `Starting ${lambdaName} for job ${job.startTime} for episode ${episode.podcastSlug} ${
        episode.slug
      }.`
    )

    try {
      job.lambdas[lambdaName] = {
        startTime: new Date().toISOString(),
        status: JOB_STATUS.PROCESSING,
      }
      await putJob(job)
    } catch (error) {
      console.error(
        `Error updating job ${job.startTime} for episode ${episode.podcastSlug} ${
          episode.slug
        } in lambda ${lambdaName}`
      )
    }

    const nextMessages: any = []
    const nextWrapper = (nextMessage: any) => {
      nextMessages.push(nextMessage)
    }

    try {
      await func(episode, job, message.message, env, nextWrapper)
    } catch (error) {
      console.error(
        `Error completing ${lambdaName} for job ${job.startTime} for episode ${
          episode.podcastSlug
        } ${episode.slug}.`
      )
      job.lambdas[lambdaName] = {
        ...job.lambdas[lambdaName],
        endTime: new Date().toISOString(),
        error: error.message,
        status: JOB_STATUS.ERROR,
      }
      await putJob(job)
      throw error
    }

    try {
      job.lambdas[lambdaName] = {
        ...job.lambdas[lambdaName],
        endTime: new Date().toISOString(),
        status: JOB_STATUS.COMPLETED,
      }
      await putJob(job)
    } catch (error) {
      console.error(
        `Error updating job ${job.startTime} for episode ${episode.podcastSlug} ${
          episode.slug
        } in lambda ${lambdaName}`
      )
    }

    console.log(
      `Completed ${lambdaName} for job ${job.startTime} for episode ${episode.podcastSlug} ${
        episode.slug
      }.`
    )

    for (const nextMessage of nextMessages) {
      await next({
        job: job.startTime.toISOString(),
        message: nextMessage,
      })
    }
  }
}

export const createJobHandler = (
  func: (env?: NodeJS.ProcessEnv, next?: NextFunction<IEpisode>) => Promise<void>
) => {
  return async (event: any, env: NodeJS.ProcessEnv, next: NextAsyncFunction): Promise<void> => {
    const episodes: IEpisode[] = []

    const nextHandler = (message: IEpisode) => {
      episodes.push(message)
    }

    try {
      await func(env, nextHandler)

      for (const episode of episodes) {
        const job: IJob = {
          info: {},
          lambdas: {},
          podcastSlug: episode.podcastSlug,
          publishTimestamp: episode.publishTimestamp,
          startTime: new Date(),
          status: JOB_STATUS.PROCESSING,
        }
        await putJob(job)

        await next({ job: job.startTime.toISOString() })

        console.log(
          `Created job ${job.startTime.toISOString()} for episode ${episode.podcastSlug} ${
            episode.slug
          }.`
        )
      }
    } catch (error) {
      console.error('Error starting job.')
      throw error
    }
  }
}

export const startJobLambda = (
  func: (env?: NodeJS.ProcessEnv, next?: NextFunction<IEpisode>) => Promise<void>
) => {
  return asyncHandler(baseHandler(createJobHandler(func), { output: snsOutput }))
}

export const jobLambda = <T>(
  func: (
    episode?: IEpisode,
    job?: IJob,
    message?: any,
    env?: NodeJS.ProcessEnv,
    next?: NextFunction<T>
  ) => Promise<void>,
  options: {
    input?: (event?: any, env?: NodeJS.ProcessEnv, next?: NextAsyncFunction) => Promise<void>
    output?: (event?: any, env?: NodeJS.ProcessEnv) => Promise<void>
  } = {
    input: snsInput,
    output: snsOutput,
  }
) => {
  return asyncHandler(baseHandler(jobHanlder(func), options))
}
