import { MAX_SEGMENT_LENGTH, SEGMENT_OVERLAP_LENGTH } from '../../constants'
import {
  IEpisodeSegmentPendingMessage,
  IEpisodeSegmentStartMessage,
  IJobInput,
} from '../../types/jobs'
import { NextFunction } from '../../types/lambdas'
import { createSegmentJob } from '../../utils/aws/transcode'
import { getTranscodePipeline } from '../../utils/environment'
import { jobLambda } from '../../utils/job'

const round = (num: number, places: number = 0): number => {
  return Number(num.toFixed(places))
}

const splitEpisodeAudioIntoSegments = async (
  input: IJobInput<IEpisodeSegmentStartMessage>,
  next: NextFunction<IEpisodeSegmentPendingMessage>
) => {
  const pipelineId = getTranscodePipeline()
  const numSegments = Math.ceil(input.episode.duration / MAX_SEGMENT_LENGTH)
  const segmentDuration = round(Math.ceil(input.episode.duration / numSegments), 3)
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
  const finalDuration = round(input.episode.duration - startTime, 3)
  const finalJob = await createSegmentJob(
    pipelineId,
    inputFilename,
    input.episode,
    startTime,
    finalDuration
  )
  segmentJobs.push(finalJob)

  next(segmentJobs, 60)
}

export const handler = jobLambda(splitEpisodeAudioIntoSegments)
