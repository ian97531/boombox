import { getEpisode } from '@boombox/shared/src/db/episodes'
import { getJob, putJob } from '@boombox/shared/src/db/jobs'
import { IEpisode } from '@boombox/shared/src/types/models/episode'
import {
  IJob,
  IJobMessage,
  IJobRequest,
  IJobStatusUpdate,
  JOB_STATUS,
} from '@boombox/shared/src/types/models/job'
import { ENV, ILambdaRequest } from '../types/lambda'
import { createLogger, getLogger, ILogger } from './aws/cloudwatch'
import { sendSQSMessage } from './aws/sqs'

export class JobController<Input, Output> {
  public episode: IEpisode
  public job: IJob
  public lambdaName: string
  private logger: ILogger
  private lambda: ILambdaRequest<Input, Output>

  constructor(
    job: IJob,
    episode: IEpisode,
    logger: ILogger,
    lambda: ILambdaRequest<Input, Output>
  ) {
    this.job = job
    this.episode = episode
    this.lambdaName = lambda.getEnvVariable(ENV.AWS_LAMBDA_FUNCTION_NAME) as string
    this.logger = logger
    this.lambda = lambda
  }

  public async logError(message: string, error?: Error) {
    await this.log(`ERROR:  ${message}`)
    await this.updateJobStep({
      endTime: new Date().toISOString(),
      error: error ? error.message : '',
      status: JOB_STATUS.ERROR,
    })
  }

  public async log(message: string, obj?: any) {
    if (this.logger) {
      await this.logger.sendLog(`${this.lambdaName}: ${message}`)
    }
    this.lambda.log(message)
  }

  public async logRetrying() {
    await this.log('Retrying lambda.')
    await this.updateJobStep({ status: JOB_STATUS.RETRYING })
  }

  public async logCompleted(messages: any) {
    await this.log('Completed lambda.')
    await this.updateJobStep({
      endTime: new Date().toISOString(),
      output: messages,
      status: JOB_STATUS.COMPLETED,
    })
  }

  public async startJobStep() {
    this.job.lambdas[this.lambdaName] = {
      startTime: new Date().toISOString(),
      status: JOB_STATUS.PROCESSING,
    }
    await putJob(this.job)
  }

  public async updateJobStep(update: IJobStatusUpdate) {
    this.job.lambdas[this.lambdaName] = {
      ...this.job.lambdas[this.lambdaName],
      ...update,
    }
    this.job.sequenceToken = this.logger.sequenceToken
    await putJob(this.job)
  }

  public createJobMessage<T>(message: T): IJobMessage<T> {
    return {
      job: this.job.startTime.toISOString(),
      message,
    }
  }

  public getRequest(): IJobRequest {
    const self = this
    return {
      episode: self.episode,
      async log(message: string, obj?: any): Promise<void> {
        await self.log(message, obj)
        self.lambda.log(message)
      },

      async createSubJob<T>(queue: string, message: T): Promise<void> {
        const jobMessage = self.createJobMessage(message)
        await sendSQSMessage(jobMessage, queue)
      },
    }
  }
}

export const getJobController = async <Input, Output>(
  jobName: string,
  lambda: ILambdaRequest<Input, Output>
): Promise<JobController<Input, Output>> => {
  const job: IJob = await getJob(jobName)
  const publishedAtKey = new Date(job.publishedAt)
  const episode: IEpisode = await getEpisode(job.podcastSlug, publishedAtKey)
  const logger = getLogger(job.logStreamName, job.logGroupName, job.sequenceToken)
  const jobController = new JobController(job, episode, logger, lambda)
  await jobController.startJobStep()
  return jobController
}

export const createJobControllerForEpisode = async <Input, Output>(
  episode: IEpisode,
  lambda: ILambdaRequest<Input, Output>
): Promise<JobController<Input, Output>> => {
  const startTime = new Date()
  const jobName = startTime.toISOString().replace(/:/gi, '.')
  const logGroupName = lambda.getEnvVariable(ENV.JOBS_LOG_GROUP) as string
  const logStreamName = `${jobName} ${episode.podcastSlug} ${episode.slug}`
  const logger = await createLogger(logStreamName, logGroupName)

  const job: IJob = {
    episodeSlug: episode.slug,
    info: {},
    lambdas: {},
    logGroupName,
    logStreamName,
    podcastSlug: episode.podcastSlug,
    publishedAt: episode.publishedAt,
    startTime,
    status: JOB_STATUS.PROCESSING,
  }
  await putJob(job)

  return new JobController(job, episode, logger, lambda)
}
