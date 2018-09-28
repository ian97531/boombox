import { IEpisode } from '@boombox/shared/src/types/models/episode'
import { IJob } from '@boombox/shared/src/types/models/job'
import * as AWS from 'aws-sdk'
import { ENV } from '../../../constants'
import { Transcription } from '../../../utils/aws/Transcription'
import { jobLambda } from '../../../utils/lambda'
import { buildFilename } from '../../../utils/s3'

const s3 = new AWS.S3()

const normalizeSegmentTranscription = async (
  episode: IEpisode,
  job: IJob,
  message: any,
  env: { [id: string]: any }
) => {
  const inputBucket = env[ENV.INPUT_BUCKET]
  const outputBucket = env[ENV.OUTPUT_BUCKET]
  const inputFilename = message.event.
  

  const response = await s3.getObject({ Bucket: inputBucket })
}

export const handler = jobLambda(normalizeSegmentTranscription)
