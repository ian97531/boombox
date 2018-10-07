import { IJobInput, IWatsonNormalizeMessage } from '../../types/jobs'
import { putJsonFile } from '../../utils/aws/s3'
import { getBucket } from '../../utils/environment'
import { jobLambda } from '../../utils/job'
import { appendAllTranscriptions } from '../../utils/normalized/append'
import { getTranscription } from '../../utils/watson/transcribe'
import { WatsonTranscription } from '../../utils/watson/Transcription'

const awsNormalize = async (input: IJobInput<IWatsonNormalizeMessage>) => {
  const bucket = getBucket()
  const normalizedTranscriptions = []
  for (const segment of input.message.segments) {
    const rawTranscription = await getTranscription(segment)
    const transcription = new WatsonTranscription(rawTranscription)
    normalizedTranscriptions.push(transcription.getNormalizedTranscription())
  }

  const fullTranscription = appendAllTranscriptions(normalizedTranscriptions)
  await putJsonFile(bucket, input.message.transcriptionFile, fullTranscription)
}

export const handler = jobLambda(awsNormalize)
