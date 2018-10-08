export type TimeoutCallback = () => Promise<void>

export enum ENV {
  AWS_LAMBDA_FUNCTION_NAME = 'AWS_LAMBDA_FUNCTION_NAME',
  AWS_TRANSCRIBE_QUEUE = 'AWS_TRANSCRIBE_QUEUE',
  BUCKET = 'BUCKET',
  NEXT_QUEUE = 'NEXT_QUEUE',
  EPISODES_TABLE = 'EPISODES_TABLE',
  ERROR_TOPIC = 'ERROR_TOPIC',
  JOBS_LOG_GROUP = 'JOBS_LOG_GROUP',
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

export interface ILambdaRequest<Input, Output> {
  input: Input
  nextFunction: (message: Output, delay?: number) => void
  retryFunction: (delay?: number) => void
  onTimeout: (func: TimeoutCallback) => void
  getEnvVariable: (environmentVariable: ENV) => string | number
  log: (message: string) => void
}
