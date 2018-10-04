import { ENV } from '../../constants'
import { IAWSNormalizeMessage, IAWSTranscribePendingMessage, IJobInput } from '../../types/jobs'
import { NextFunction, RetryFunction } from '../../types/lambdas'
import { jobLambda } from '../../utils/job'
import { logError } from '../../utils/status'
import { checkTranscriptionExists } from '../../utils/transcribe'

const awsTranscribePending = async (
  input: IJobInput<IAWSTranscribePendingMessage>,
  next: NextFunction<IAWSNormalizeMessage>,
  retry: RetryFunction
) => {
  const bucket = process.env[ENV.BUCKET]
  if (bucket === undefined) {
    throw logError('The environment variable BUCKET is not defined.')
  }
  const numTranscriptions = input.message.segments.length
  let completeTranscriptions = 0
  for (const segment of input.message.segments) {
    if (await checkTranscriptionExists(bucket, segment.transcript)) {
      completeTranscriptions += 1
    }
  }

  if (completeTranscriptions === numTranscriptions) {
    next(input.message)
  } else {
    retry()
  }
}

export const handler = jobLambda(awsTranscribePending)
