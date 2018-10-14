import { sleep } from '@boombox/shared/src/utils/timing'
import * as AWS from 'aws-sdk'

const DEFAULT_TIMEOUT_MS = 5 * 1000 // 5 seconds
const cloudwatch = new AWS.CloudWatchLogs()

export interface ILogger {
  sequenceToken: AWS.CloudWatchLogs.SequenceToken | undefined
  sendLog: (message: string) => Promise<void>
}

export const getLogger = (
  logStreamName: string,
  logGroupName: string,
  sequenceToken?: AWS.CloudWatchLogs.SequenceToken
): ILogger => {
  const logger: ILogger = {
    sequenceToken,
    async sendLog(
      message: string,
      timeoutMilliseconds: number = DEFAULT_TIMEOUT_MS
    ): Promise<void> {
      const startTime = Date.now()
      const logEventsParams: AWS.CloudWatchLogs.PutLogEventsRequest = {
        logEvents: [
          {
            message,
            timestamp: Date.now(),
          },
        ],
        logGroupName,
        logStreamName,
      }
      if (this.sequenceToken) {
        logEventsParams.sequenceToken = this.sequenceToken
      }
      let response: AWS.CloudWatchLogs.PutLogEventsResponse | undefined
      let timedOut = false

      while (!response && !timedOut) {
        try {
          response = await cloudwatch.putLogEvents(logEventsParams).promise()
        } catch (error) {
          if (error.name === 'ThrottlingException') {
            console.log('cloudwatch log was throttled.')
            await sleep(1000)
          } else {
            throw error
          }
        }
        timedOut = Date.now() - startTime > timeoutMilliseconds
      }

      if (!response) {
        throw Error('sendLog timed out')
      }

      if (response.nextSequenceToken) {
        this.sequenceToken = response.nextSequenceToken
      }
    },
  }
  return logger
}

export const createLogger = async (
  logStreamName: string,
  logGroupName: string
): Promise<ILogger> => {
  const params = {
    logGroupName,
    logStreamName,
  }
  await cloudwatch.createLogStream(params).promise()

  return getLogger(logStreamName, logGroupName)
}
