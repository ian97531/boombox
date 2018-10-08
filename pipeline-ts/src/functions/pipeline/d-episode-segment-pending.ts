import { IJobRequest } from '@boombox/shared/src/types/models/job'
import {
  IEpisodeSegmentPendingMessage,
  IEpisodeTranscribeStartMessage,
} from '../../types/jobMessages'
import { ILambdaRequest } from '../../types/lambda'
import { checkSegmentFileExists } from '../../utils/aws/transcode'
import { jobHandler } from '../../utils/jobHandler'

const episodeSegmentPending = async (
  lambda: ILambdaRequest<IEpisodeSegmentPendingMessage, IEpisodeTranscribeStartMessage>,
  job: IJobRequest
) => {
  const segments = lambda.input
  const completeSegments: IEpisodeTranscribeStartMessage = []

  for (const segment of segments) {
    const segmentComplete = await checkSegmentFileExists(segment)
    if (segmentComplete) {
      completeSegments.push(segment)
    }
  }

  if (segments.length === completeSegments.length) {
    await job.log(`All ${segments.length} segments are ready to be transcribed.`)
    lambda.nextFunction(completeSegments)
  } else {
    await job.log(
      `${completeSegments.length} of ${segments.length} segments are ready to be transcribed.`
    )
    lambda.retryFunction(60)
  }
}

export const handler = jobHandler(episodeSegmentPending)
