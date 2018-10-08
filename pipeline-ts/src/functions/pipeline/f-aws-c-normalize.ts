import { IJobRequest } from '@boombox/shared/src/types/models/job'
import { IAWSNormalizeMessage } from '../../types/jobMessages'
import { ENV, ILambdaRequest } from '../../types/lambda'
import { putJsonFile } from '../../utils/aws/s3'
import { getTranscription } from '../../utils/aws/transcribe'
import { AWSTranscription } from '../../utils/aws/Transcription'
import { jobHandler } from '../../utils/jobHandler'
import { appendAllTranscriptions } from '../../utils/normalized/append'

const awsNormalize = async (
  lambda: ILambdaRequest<IAWSNormalizeMessage, void>,
  job: IJobRequest
) => {
  const transcriptionJob = lambda.input
  const bucket = lambda.getEnvVariable(ENV.BUCKET) as string
  const normalizedTranscriptions = []
  for (const segment of transcriptionJob.segments) {
    const rawTranscription = await getTranscription(segment)
    const transcription = new AWSTranscription(rawTranscription)
    normalizedTranscriptions.push(transcription.getNormalizedTranscription())
  }

  const fullTranscription = appendAllTranscriptions(normalizedTranscriptions)
  await putJsonFile(bucket, transcriptionJob.transcriptionFile, fullTranscription)
}

export const handler = jobHandler(awsNormalize)
