import {
  IEpisodeSegmentPendingMessage,
  IEpisodeTranscribeStartMessage,
  IJobInput,
} from '../../types/jobs'
import { NextFunction, RetryFunction } from '../../types/lambdas'
import { checkSegmentFileExists } from '../../utils/aws/transcode'
import { jobLambda } from '../../utils/job'
import { logStatus } from '../../utils/status'

const episodeSegmentPending = async (
  input: IJobInput<IEpisodeSegmentPendingMessage>,
  next: NextFunction<IEpisodeTranscribeStartMessage>,
  retry: RetryFunction
) => {
  const jobsStarted = input.message.length
  const readyForTranscription: IEpisodeTranscribeStartMessage = []

  for (const segmentJob of input.message) {
    const segment = {
      duration: segmentJob.duration,
      filename: segmentJob.filename,
      startTime: segmentJob.startTime,
    }

    const segmentComplete = await checkSegmentFileExists(segment)
    if (segmentComplete) {
      readyForTranscription.push(segment)
    }
  }

  if (jobsStarted === readyForTranscription.length) {
    logStatus(`All ${jobsStarted} segment transcode jobs are completed.`)
    next(readyForTranscription)
  } else {
    logStatus(
      `${readyForTranscription.length} of ${jobsStarted} segment transcode jobs are completed.`
    )
    retry(60)
  }
}

export const handler = jobLambda(episodeSegmentPending)
