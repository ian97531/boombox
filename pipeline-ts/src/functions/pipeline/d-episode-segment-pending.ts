import {
  IEpisodeSegmentPendingMessage,
  IEpisodeTranscribeStartMessage,
  IJobInput,
} from '../../types/jobs'
import { NextFunction, RetryFunction } from '../../types/lambdas'
import { jobLambda } from '../../utils/job'
import { checkSegmentExists } from '../../utils/transcode'

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
    if (segmentJob.jobId !== undefined) {
      const segmentComplete = await checkSegmentExists(
        input.episode,
        segment.startTime,
        segment.duration
      )
      if (segmentComplete) {
        readyForTranscription.push(segment)
      }
    } else {
      readyForTranscription.push(segment)
    }
  }

  if (jobsStarted === readyForTranscription.length) {
    next(readyForTranscription)
  } else {
    retry(
      `Not all transcode jobs have completed for episode ${input.episode.podcastSlug} ${
        input.episode.slug
      }.`
    )
  }
}

export const handler = jobLambda(episodeSegmentPending)
