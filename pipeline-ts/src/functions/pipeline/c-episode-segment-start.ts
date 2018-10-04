import { ENV, MAX_SEGMENT_LENGTH, SEGMENT_OVERLAP_LENGTH } from '../../constants'
import {
  IEpisodeSegmentPendingMessage,
  IEpisodeSegmentStartMessage,
  IJobInput,
} from '../../types/jobs'
import { NextFunction } from '../../types/lambdas'
import { jobLambda } from '../../utils/job'
import { logError } from '../../utils/status'
import { createSegmentJob } from '../../utils/transcode'

const splitEpisodeAudioIntoSegments = async (
  input: IJobInput<IEpisodeSegmentStartMessage>,
  next: NextFunction<IEpisodeSegmentPendingMessage>
) => {
  const pipelineId = process.env[ENV.TRANSCODE_PIPELINE_ID]
  if (pipelineId === undefined) {
    throw logError('The TRANSCODE_PIPELINE_ID environment variable was not set.')
  }

  const numSegments = Math.ceil(input.episode.duration / MAX_SEGMENT_LENGTH)
  const segmentDuration = Math.ceil(input.episode.duration / numSegments)
  const inputFilename = input.message.filename
  const segmentJobs: IEpisodeSegmentPendingMessage = []

  let startTime = 0
  let index = 0

  while (index < numSegments - 1) {
    // Create a segment

    const transcodeJob = await createSegmentJob(
      pipelineId,
      inputFilename,
      input.episode,
      startTime,
      segmentDuration
    )
    segmentJobs.push(transcodeJob)

    // Create a small segment that overlaps the previous and next segments.
    const overlapStartTime = startTime + segmentDuration - SEGMENT_OVERLAP_LENGTH / 2
    const overlapJob = await createSegmentJob(
      pipelineId,
      inputFilename,
      input.episode,
      overlapStartTime,
      SEGMENT_OVERLAP_LENGTH
    )
    segmentJobs.push(overlapJob)

    startTime += segmentDuration
    index += 1
  }

  // Create the last segment to the end of the episode.
  const finalDuration = input.episode.duration - startTime
  const finalJob = await createSegmentJob(
    pipelineId,
    inputFilename,
    input.episode,
    startTime,
    finalDuration
  )
  segmentJobs.push(finalJob)

  next(segmentJobs)
}

export const handler = jobLambda(splitEpisodeAudioIntoSegments)
