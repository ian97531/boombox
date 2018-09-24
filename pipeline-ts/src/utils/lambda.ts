import { getEpisode } from '@boombox/shared/src/db/episodes'
import { getJob, putJob } from '@boombox/shared/src/db/jobs'
import { IEpisode, IJob, IJobMessage, JOB_STATUS } from '@boombox/shared/src/types/models'
import { Callback, Context, SNSEvent } from 'aws-lambda'
import * as AWS from 'aws-sdk'

const COMPLETION_TOPIC = 'COMPLETION_TOPIC'
const sns = new AWS.SNS()

// A base handler that will execute async functions, will warn of impending timeouts, and will
// handle errors correctly.
export function asyncHandler(
  func: (event?: any, env?: { [id: string]: any }, callback?: Callback) => Promise<void>
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
export const baseHandler = <Event, Input, Output>(
  func: (
    event: Input,
    env: { [id: string]: any },
    callback: Callback
  ) => Promise<Output> | Promise<Output[]> | Promise<void>,
  options?: {
    input?: (event?: Event, env?: { [id: string]: any }) => Promise<Input> | Promise<Input[]>
    output?: (event?: Output, env?: { [id: string]: any }) => Promise<void>
  }
) => {
  return async (event: any, env: { [id: string]: any }, callback: Callback): Promise<void> => {
    const outputItems: Output[] = []
    if (options && options.input) {
      const inputItems = await options.input(event, env)
      if (Array.isArray(inputItems)) {
        for (const item of inputItems) {
          const funcOutput = await func(item, env, callback)
          if (Array.isArray(funcOutput)) {
            outputItems.push(...funcOutput)
          } else if (funcOutput) {
            outputItems.push(funcOutput)
          }
        }
      } else {
        const funcOutput = await func(inputItems, env, callback)
        if (Array.isArray(funcOutput)) {
          outputItems.push(...funcOutput)
        } else if (funcOutput) {
          outputItems.push(funcOutput)
        }
      }
    } else {
      const funcOutput = await func(event, env, callback)
      if (Array.isArray(funcOutput)) {
        outputItems.push(...funcOutput)
      } else if (funcOutput) {
        outputItems.push(funcOutput)
      }
    }
    if (options && options.output) {
      for (const item of outputItems) {
        await options.output(item, env)
      }
    }
  }
}

// Unwraps and parses incoming SNSEvents.
export const snsInput = async <T>(event: SNSEvent, env: { [id: string]: any }): Promise<T[]> => {
  const messages = []
  for (const record of event.Records) {
    const message = JSON.parse(record.Sns.Message)
    console.log('Received SNS Message: ', JSON.stringify(message, null, 2))
    messages.push(message)
  }
  return messages
}

// Detects the presense of a COMPLETION_TOPIC environment variable, if found, the return value
// of the handler will be published to that SNS TOPIC.
export const snsOutput = async <T>(message: T, env: { [id: string]: any }): Promise<void> => {
  if (!(COMPLETION_TOPIC in env)) {
    throw Error('No COMPLETION_TOPIC was specified for this lambda.')
  }

  const params = {
    Message: JSON.stringify(message),
    TopicArn: env[COMPLETION_TOPIC],
  }
  try {
    await sns.publish(params).promise()
    console.log('Successfully sent completion SNS message to: ', env[COMPLETION_TOPIC])
  } catch (error) {
    console.error('Failed to send completion SNS message to: ', env[COMPLETION_TOPIC])
    console.error('The unsent message contained: ', JSON.stringify(message, null, 2))
  }
}

export const jobHanlder = (
  func: (episode?: IEpisode, job?: IJob, env?: { [id: string]: any }, callback?: Callback) => void
) => {
  return async (
    message: IJobMessage,
    env: { [id: string]: any },
    callback: Callback
  ): Promise<IJobMessage> => {
    const job: IJob = await getJob(message.startTime)
    const episode: IEpisode = await getEpisode(job.podcastSlug, job.publishTimestamp)
    console.log(
      `Starting ${env.AWS_LAMBDA_FUNCTION_NAME} for job ${job.startTime} for episode ${
        episode.podcastSlug
      } ${episode.slug}.`
    )

    try {
      job.lambdas[env.AWS_LAMBDA_FUNCTION_NAME] = {
        startTime: new Date().toISOString(),
        status: JOB_STATUS.PROCESSING,
      }
      await putJob(job)
    } catch (error) {
      console.error(
        `Error updating job ${job.startTime} for episode ${episode.podcastSlug} ${
          episode.slug
        } in lambda ${env.AWS_LAMBDA_FUNCTION_NAME}`
      )
    }

    try {
      await func(episode, job, env, callback)
    } catch (error) {
      console.error(
        `Error completing ${env.AWS_LAMBDA_FUNCTION_NAME} for job ${job.startTime} for episode ${
          episode.podcastSlug
        } ${episode.slug}.`
      )
      job.lambdas[env.AWS_LAMBDA_FUNCTION_NAME] = {
        ...job.lambdas[env.AWS_LAMBDA_FUNCTION_NAME],
        endTime: new Date().toISOString(),
        error: error.message,
        status: JOB_STATUS.ERROR,
      }
      await putJob(job)
      throw error
    }

    try {
      job.lambdas[env.AWS_LAMBDA_FUNCTION_NAME] = {
        ...job.lambdas[env.AWS_LAMBDA_FUNCTION_NAME],
        endTime: new Date().toISOString(),
        status: JOB_STATUS.COMPLETED,
      }
      await putJob(job)
    } catch (error) {
      console.error(
        `Error updating job ${job.startTime} for episode ${episode.podcastSlug} ${
          episode.slug
        } in lambda ${env.AWS_LAMBDA_FUNCTION_NAME}`
      )
    }

    console.log(
      `Completed ${env.AWS_LAMBDA_FUNCTION_NAME} for job ${job.startTime} for episode ${
        episode.podcastSlug
      } ${episode.slug}.`
    )

    return { startTime: job.startTime.toISOString() }
  }
}

export const createJobHandler = (
  func: (env?: { [id: string]: any }, callback?: Callback) => Promise<IEpisode[]>
) => {
  return async (
    event: any,
    env: { [id: string]: any },
    callback: Callback
  ): Promise<IJobMessage[]> => {
    const messages = []
    try {
      const episodes = await func(env, callback)
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
        messages.push({ startTime: job.startTime.toISOString() })
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
    return messages
  }
}

export const startJobLambda = (
  func: (message?: any, env?: { [id: string]: any }, callback?: Callback) => Promise<IEpisode[]>
) => {
  return asyncHandler(baseHandler(createJobHandler(func), { output: snsOutput }))
}

export const jobLambda = (
  func: (episode?: IEpisode, job?: IJob, env?: { [id: string]: any }, callback?: Callback) => void
) => {
  return asyncHandler(baseHandler(jobHanlder(func), { input: snsInput, output: snsOutput }))
}
