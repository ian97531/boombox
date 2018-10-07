import {
  IJobInput,
  IWatsonNormalizeMessage,
  IWatsonTranscribePendingMessage,
} from '../../types/jobs'
import { NextFunction, RetryFunction } from '../../types/lambdas'
import { jobLambda } from '../../utils/job'
import { checkTranscriptionJobComplete, saveTranscriptionToS3 } from '../../utils/watson/transcribe'

const watsonTranscribePending = async (
  input: IJobInput<IWatsonTranscribePendingMessage>,
  next: NextFunction<IWatsonNormalizeMessage>,
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

export const handler = jobLambda(watsonTranscribePending)
