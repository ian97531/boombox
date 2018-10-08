import * as AWS from 'aws-sdk'

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
    async sendLog(message: string): Promise<void> {
      const logEventsParams = {
        logEvents: [
          {
            message,
            timestamp: Date.now(),
          },
        ],
        logGroupName,
        logStreamName,
        sequenceToken: this.sequenceToken,
      }
      const response = await cloudwatch.putLogEvents(logEventsParams).promise()

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
