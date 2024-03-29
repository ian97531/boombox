import * as dynamo from './db/dynamo'
import * as episodes from './db/episodes'
import * as podcasts from './db/podcasts'
import * as speakers from './db/speakers'
import * as statements from './db/statements'

import * as cloudwatch from './utils/aws/cloudwatch'
import * as s3 from './utils/aws/s3'
import * as sqs from './utils/aws/sqs'
import * as throttle from './utils/aws/throttle'
import * as transcode from './utils/aws/transcode'
import * as transcribe from './utils/aws/transcribe'

import * as watsonTranscribe from './utils/watson/transcribe'

import * as numbers from './utils/numbers'
import * as timing from './utils/timing'

export const db = {
  dynamo,
  episodes,
  podcasts,
  speakers,
  statements,
}

export const aws = {
  cloudwatch,
  s3,
  sqs,
  throttle,
  transcode,
  transcribe,
}

export const utils = {
  numbers,
  timing,
}

export const watson = {
  transcribe: watsonTranscribe,
}

export { IEpisode, IEpisodeDBRecord } from './db/episodes'
export { IPodcast, IPodcastDBRecord } from './db/podcasts'
export { ISpeaker } from './db/speakers'
export {
  IStatement,
  IStatementDBRecord,
  IStatementWord,
  ITranscript,
  ITranscriptWord,
} from './db/statements'
export * from './types/aws'
export * from './types/responses'
export * from './types/watson'
export { ILogger } from './utils/aws/cloudwatch'
export { AWS_TRANSCODE_PRESETS } from './utils/aws/transcode'
export { AWS_TRANSCRIBE_STATUS } from './utils/aws/transcribe'
export { WATSON_TRANSCRIBE_STATUS } from './utils/watson/transcribe'
