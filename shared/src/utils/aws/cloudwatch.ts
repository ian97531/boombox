import * as AWS from 'aws-sdk'
import { retryThrottledRequests } from './throttle'

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
    async sendLog(message: string, timeoutMilliseconds?: number): Promise<void> {
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
      const response = await retryThrottledRequests(async () => {
        return await cloudwatch.putLogEvents(logEventsParams).promise()
      }, timeoutMilliseconds)

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
