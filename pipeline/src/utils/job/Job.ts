import { aws, ILogger } from '@boombox/shared'
import { Lambda } from '../lambda'
import { ENV } from './constants'
import { putJob } from './db'

enum JOB_STATUS {
  UNSTARTED = 'UNSTARTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
  RETRYING = 'RETRYING',
}

export interface IJob {
  startTime: string
  status: JOB_STATUS
  logGroupName: string
  logStreamName: string
  sequenceToken?: string
}

export class Job {
  public static async create(lambda: Lambda, logName: string): Promise<Job> {
    const now = new Date()
    const startTime = now.toISOString()

    // Log Stream names may not contain colons.
    const jobName = startTime.replace(/:/gi, '-')
    const logGroupName = Lambda.getEnvVariable(ENV.JOBS_LOG_GROUP) as string
    const logStreamName = `${jobName} ${logName}`
    const logger = await aws.cloudwatch.createLogger(logStreamName, logGroupName)

    const job: IJob = {
      logGroupName,
      logStreamName,
      sequenceToken: logger.sequenceToken,
      startTime,
      status: JOB_STATUS.PROCESSING,
    }
    await putJob(job)
    return new Job(lambda, job)
  }

  private job: IJob
  private lambdaName: string
  private logger: ILogger
  private lambda: Lambda

  constructor(lambda: Lambda, job: IJob) {
    this.job = job
    this.lambdaName = Lambda.getEnvVariable(ENV.AWS_LAMBDA_FUNCTION_NAME) as string
    this.logger = aws.cloudwatch.getLogger(job.logStreamName, job.logGroupName, job.sequenceToken)
    this.lambda = lambda
  }

  public getJob(): IJob {
    return this.job
  }

  public async completeWithError(error: Error) {
    this.job.status = JOB_STATUS.ERROR
    await this.logError('Job has ended with an error', error)
    await putJob(this.getJob())
  }

  public async completeWithSuccess() {
    this.job.status = JOB_STATUS.COMPLETED
    await this.logError('Job has successfully completed')
    await putJob(this.getJob())
  }

  public getName(): string {
    return this.job.startTime
  }

  public async log(message: string, obj?: any) {
    if (this.logger) {
      const time = new Date()
      const timestamp = time.toLocaleString('en-US', {
        hour12: true,
        timeZone: 'America/Los_Angeles',
      })
      await this.logger.sendLog(`${timestamp}: ${this.lambdaName}: ${message}`)
      this.job.sequenceToken = this.logger.sequenceToken
    }
    this.lambda.log(message)
  }

  public async logError(message: string, error?: Error) {
    await this.log(message)
    if (error) {
      await this.log(`Error Name: ${error.name}`)
      await this.log(`Error Message: ${error.message}`)
      if (error.stack) {
        await this.log(`Error Stack: ${error.stack}`)
      }
    }
  }
}
