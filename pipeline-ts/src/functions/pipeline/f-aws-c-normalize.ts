import { IAWSNormalizeMessage, IJobInput } from '../../types/jobs'
import { putJsonFile } from '../../utils/aws/s3'
import { getTranscription } from '../../utils/aws/transcribe'
import { AWSTranscription } from '../../utils/aws/Transcription'
import { getBucket } from '../../utils/environment'
import { jobLambda } from '../../utils/job'
import { appendAllTranscriptions } from '../../utils/normalized/append'

const awsNormalize = async (input: IJobInput<IAWSNormalizeMessage>) => {
  const bucket = getBucket()
  const normalizedTranscriptions = []
  for (const segment of input.message.segments) {
    const rawTranscription = await getTranscription(segment)
    const transcription = new AWSTranscription(rawTranscription)
    normalizedTranscriptions.push(transcription.getNormalizedTranscription())
  }

  const fullTranscription = appendAllTranscriptions(normalizedTranscriptions)
  await putJsonFile(bucket, input.message.transcriptionFile, fullTranscription)
}

export const handler = jobLambda(awsNormalize)
