import { IEpisode } from '@boombox/shared/src/types/models/episode'
import { IJob } from '@boombox/shared/src/types/models/job'
import * as AWS from 'aws-sdk'
import { ENV } from '../../../constants'
import { jobLambda, s3Input } from '../../../utils/lambda'
import { buildFilename, getFileInfo } from '../../../utils/s3'

const s3 = new AWS.S3()

const fetchTranscriptionResult = async (
  episode: IEpisode,
  job: IJob,
  message: any,
  env: { [id: string]: any }
) => {
  const inputFilename = message.event.s3.object.key
  const inputBucket = message.event.s3.bucket.name
  const filenameParts = getFileInfo(inputFilename, { separator: '__' })
  const outputFilename = buildFilename(episode, job, {
    startTime: filenameParts.startTime,
    suffix: 'json',
  })
  await s3.copyObject({
    Bucket: env[ENV.OUTPUT_BUCKET],
    CopySource: `${inputBucket}/${inputFilename}`,
    Key: outputFilename,
  })

  if (inputBucket === env[ENV.OUTPUT_BUCKET]) {
    await s3.deleteObject({
      Bucket: inputBucket,
      Key: inputFilename,
    })
  }

  if (job.info.transcriptions) {
    return {
      transcriptions: [...job.info.transcriptions, outputFilename],
    }
  } else {
    return { transcriptions: [outputFilename] }
  }
}

export const handler = jobLambda(fetchTranscriptionResult, {
  input: s3Input({ separator: '__' }),
})
