import { IAWSNormalizeMessage, IAWSTranscribePendingMessage, IJobInput } from '../../types/jobs'
import { NextFunction, RetryFunction } from '../../types/lambdas'
import { checkTranscriptionJobComplete, saveTranscriptionToS3 } from '../../utils/aws/transcribe'
import { jobLambda } from '../../utils/job'

const awsTranscribePending = async (
  input: IJobInput<IAWSTranscribePendingMessage>,
  next: NextFunction<IAWSNormalizeMessage>,
  retry: RetryFunction
) => {
  const numTranscriptions = input.message.segments.length
  let completeTranscriptions = 0
  for (const segment of input.message.segments) {
    if (await checkTranscriptionJobComplete(segment)) {
      await saveTranscriptionToS3(segment)
      completeTranscriptions += 1
    }
  }

  if (completeTranscriptions === numTranscriptions) {
    next(input.message)
  } else {
    retry(60)
  }
}

export const handler = jobLambda(awsTranscribePending)
