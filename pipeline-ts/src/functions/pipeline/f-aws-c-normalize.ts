import { ENV } from '../../constants'
import { IAWSTranscriptionResult } from '../../types/aws'
import { IAWSNormalizeMessage, IJobInput } from '../../types/jobs'
import { AWSTranscription } from '../../utils/aws/Transcription'
import { jobLambda } from '../../utils/job'
import { getJsonFile } from '../../utils/s3'
import { logError } from '../../utils/status'

const awsNormalize = async (input: IJobInput<IAWSNormalizeMessage>) => {
  const bucket = process.env[ENV.BUCKET]
  if (bucket === undefined) {
    throw logError('The environment variable BUCKET is not defined.')
  }

  const normalizedTranscriptions = []
  for (const segment of input.message.segments) {
    const rawTranscription = getJsonFile<IAWSTranscriptionResult>(bucket, segment.transcript)
    const transcription = new AWSTranscription(rawTranscription)
    normalizedTranscriptions.push(transcription.getNormalizedTranscription())
  }
}

export const handler = jobLambda(awsNormalize)
