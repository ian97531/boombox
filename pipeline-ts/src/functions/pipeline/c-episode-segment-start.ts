import { IJobRequest } from '@boombox/shared/src/types/models/job'
import { MAX_SEGMENT_LENGTH, SEGMENT_OVERLAP_LENGTH } from '../../constants'
import { IEpisodeSegmentPendingMessage, IEpisodeSegmentStartMessage } from '../../types/jobMessages'
import { ENV, ILambdaRequest } from '../../types/lambda'
import { createSegmentJob } from '../../utils/aws/transcode'
import { jobHandler } from '../../utils/jobHandler'

const round = (num: number, places: number = 0): number => {
  return Number(num.toFixed(places))
}

const splitEpisodeAudioIntoSegments = async (
  lambda: ILambdaRequest<IEpisodeSegmentStartMessage, IEpisodeSegmentPendingMessage>,
  job: IJobRequest
) => {
  const pipelineId = lambda.getEnvVariable(ENV.TRANSCODE_PIPELINE_ID) as string
  const numSegments = Math.ceil(job.episode.duration / MAX_SEGMENT_LENGTH)
  const segmentDuration = round(Math.ceil(job.episode.duration / numSegments), 3)
  const inputFilename = lambda.input.filename
  const segmentJobs: IEpisodeSegmentPendingMessage = []

  let startTime = 0
  let index = 0

  while (index < numSegments - 1) {
    // Create a segment
    const transcodeJob = await createSegmentJob(
      pipelineId,
      inputFilename,
      job.episode,
      startTime,
      segmentDuration
    )
    segmentJobs.push(transcodeJob)

    // Create a small segment that overlaps the previous and next segments.
    const overlapStartTime = startTime + segmentDuration - SEGMENT_OVERLAP_LENGTH / 2
    const overlapJob = await createSegmentJob(
      pipelineId,
      inputFilename,
      job.episode,
      overlapStartTime,
      SEGMENT_OVERLAP_LENGTH
    )
    segmentJobs.push(overlapJob)

    startTime += segmentDuration
    index += 1
  }

  // Create the last segment to the end of the episode.
  const finalDuration = round(job.episode.duration - startTime, 3)
  const finalJob = await createSegmentJob(
    pipelineId,
    inputFilename,
    job.episode,
    startTime,
    finalDuration
  )
  segmentJobs.push(finalJob)

  lambda.nextFunction(segmentJobs, 60)
}

export const handler = jobHandler(splitEpisodeAudioIntoSegments)
