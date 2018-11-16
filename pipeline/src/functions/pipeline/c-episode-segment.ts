import { aws } from '@boombox/shared'
import { episodeTranscribe } from 'functions/pipeline/d-episode-transcribe'
import { ENV, episodeCaller, episodeHandler, EpisodeJob, ISegment } from 'utils/episode'
import { Job } from 'utils/job'
import { Lambda } from 'utils/lambda'

const startSegmentJob = async (
  pipelineId: string,
  job: Job,
  episode: EpisodeJob,
  segment: ISegment
): Promise<boolean> => {
  let jobStarted = false
  if (episode.audio === undefined) {
    throw Error('The provided episode does not have audio information set.')
  }

  if (!(await aws.s3.checkFileExists(episode.segmentsBucket, segment.audio.filename))) {
    await aws.transcode.createJob(
      pipelineId,
      episode.audio.filename,
      segment.audio.filename,
      episode.bucket,
      segment.audio.startTime,
      segment.audio.duration
    )
    await job.log(
      `Started a transcode job to split ${episode.audio.filename} at a start time ` +
        `of ${segment.audio.startTime} seconds for a duration of ${segment.audio.duration} seconds.`
    )
    jobStarted = true
  } else {
    await job.log(
      `Skipping transcode job to split ${episode.audio.filename} at a start time ` +
        `of ${segment.audio.startTime} seconds for a duration of ${segment.audio.duration}  ` +
        'seconds because that segment audio file already exists.'
    )
  }
  return jobStarted
}

const episodeSegmentHandler = async (lambda: Lambda, job: Job, episode: EpisodeJob) => {
  const pipelineId = Lambda.getEnvVariable(ENV.TRANSCODE_PIPELINE_ID) as string
  let delay = 0
  for (const segment of episode.segments) {
    const jobStarted = await startSegmentJob(pipelineId, job, episode, segment)
    delay = jobStarted ? 60 : 0
  }

  episodeTranscribe(lambda, job, episode, delay)
}

export const episodeSegment = episodeCaller(ENV.EPISODE_SEGMENT_QUEUE)
export const handler = episodeHandler(episodeSegmentHandler)
