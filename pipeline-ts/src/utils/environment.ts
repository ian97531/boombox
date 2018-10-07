enum ENV {
  AWS_LAMBDA_FUNCTION_NAME = 'AWS_LAMBDA_FUNCTION_NAME',
  AWS_TRANSCRIBE_QUEUE = 'AWS_TRANSCRIBE_QUEUE',
  BUCKET = 'BUCKET',
  NEXT_QUEUE = 'NEXT_QUEUE',
  EPISODES_TABLE = 'EPISODES_TABLE',
  ERROR_TOPIC = 'ERROR_TOPIC',
  JOBS_TABLE = 'JOBS_TABLE',
  PODCASTS_TABLE = 'PODCASTS_TABLE',
  RETRY_QUEUE = 'RETRY_QUEUE',
  SPEAKERS_TABLE = 'SPEAKERS_TABLE',
  STATEMENTS_TABLE = 'STATEMENTS_TABLE',
  STATEMENTS_TABLE_WCU = 'STATEMENTS_TABLE_WCU',
  STATUS_TOPIC = 'STATUS_TOPIC',
  TRANSCODE_PIPELINE_ID = 'TRANSCODE_PIPELINE_ID',
  WATSON_TRANSCRIBE_CREDENTIALS = 'WATSON_TRANSCRIBE_CREDENTIALS',
  WATSON_TRANSCRIBE_QUEUE = 'WATSON_TRANSCRIBE_QUEUE',
}

export const getAwsTranscribeQueue = (): string => {
  const queue = process.env[ENV.AWS_TRANSCRIBE_QUEUE]
  if (queue === undefined) {
    throw Error('The AWS_TRANSCRIBE_QUEUE environment variable is not defined.')
  }
  return queue
}

export const getBucket = (): string => {
  const bucket = process.env[ENV.BUCKET]
  if (bucket === undefined) {
    throw Error('The BUCKET environment variable is not defined.')
  }
  return bucket
}

export const getLambdaFunctionName = (): string => {
  const lambdaName = process.env[ENV.AWS_LAMBDA_FUNCTION_NAME]
  if (lambdaName === undefined) {
    throw Error('The AWS_LAMBDA_FUNCTION_NAME environment variable is not defined.')
  }
  return lambdaName
}

export const getNextQueue = (): string => {
  const nextQueueUrl = process.env[ENV.NEXT_QUEUE]
  if (nextQueueUrl === undefined) {
    throw Error('The NEXT_QUEUE environment variable is not defined.')
  }
  return nextQueueUrl
}

export const getRetryQueue = (): string => {
  const retryQueueUrl = process.env[ENV.RETRY_QUEUE]
  if (retryQueueUrl === undefined) {
    throw Error('The RETRY_QUEUE environment variable is not defined.')
  }
  return retryQueueUrl
}

export const getStatementsTableWriteCapacity = (): number => {
  const statementsTableWriteCapacity = process.env[ENV.STATEMENTS_TABLE_WCU]
  if (statementsTableWriteCapacity === undefined) {
    throw Error('The STATEMENTS_TABLE_WCU environment variable is not defined.')
  }
  return parseInt(statementsTableWriteCapacity, 10)
}

export const getTranscodePipeline = (): string => {
  const pipelineId = process.env[ENV.TRANSCODE_PIPELINE_ID]
  if (pipelineId === undefined) {
    throw Error('The TRANSCODE_PIPELINE_ID environment variable is not defined.')
  }
  return pipelineId
}

export const getWatsonCredentialsKey = (): string => {
  const credentialsKey = process.env[ENV.WATSON_TRANSCRIBE_QUEUE]
  if (credentialsKey === undefined) {
    throw Error('The WATSON_TRANSCRIBE_QUEUE environment variable is not defined.')
  }
  return credentialsKey
}

export const getWatsonTranscribeQueue = (): string => {
  const queue = process.env[ENV.WATSON_TRANSCRIBE_CREDENTIALS]
  if (queue === undefined) {
    throw Error('The WATSON_TRANSCRIBE_CREDENTIALS environment variable is not defined.')
  }
  return queue
}
