import { IJobRequest } from '@boombox/shared/src/types/models/job'
import { IAWSNormalizeMessage, IAWSTranscribePendingMessage } from '../../types/jobMessages'
import { ILambdaRequest } from '../../types/lambda'
import { checkTranscriptionJobComplete, saveTranscriptionToS3 } from '../../utils/aws/transcribe'
import { jobHandler } from '../../utils/jobHandler'

const awsTranscribePending = async (
  lambda: ILambdaRequest<IAWSTranscribePendingMessage, IAWSNormalizeMessage>,
  job: IJobRequest
) => {
  const transcriptionJob = lambda.input
  const numTranscriptions = transcriptionJob.segments.length
  let completeTranscriptions = 0
  for (const segment of transcriptionJob.segments) {
    if (await checkTranscriptionJobComplete(segment)) {
      await saveTranscriptionToS3(segment)
      completeTranscriptions += 1
    }
  }

  if (completeTranscriptions === numTranscriptions) {
    lambda.nextFunction(transcriptionJob)
  } else {
    lambda.retryFunction(60)
  }
}

export const handler = jobHandler(awsTranscribePending)
