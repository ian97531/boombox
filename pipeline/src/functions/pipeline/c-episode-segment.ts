import { aws, AWS_TRANSCODE_PRESETS } from '@boombox/shared'
import { ENV, episodeCaller, episodeHandler, EpisodeJob, ISegment } from '../../utils/episode'
import { Job } from '../../utils/job'
import { Lambda } from '../../utils/lambda'
import { episodeTranscribe } from './d-episode-transcribe'

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

  if (!(await aws.s3.checkFileExists(episode.segmentsBucket, segment.audio.flac))) {
    await aws.transcode.createJob(
      pipelineId,
      episode.audio.mp3,
      segment.audio.flac,
      episode.bucket,
      segment.audio.startTime,
      segment.audio.duration,
      AWS_TRANSCODE_PRESETS.FLAC_MONO
    )
    await job.log(
      `Started a FLAC transcode job to split ${episode.audio.mp3} at a start time ` +
        `of ${segment.audio.startTime} seconds for a duration of ${segment.audio.duration} seconds.`
    )
    jobStarted = true
  } else {
    await job.log(
      `Skipping FLAC transcode job to split ${episode.audio.mp3} at a start time ` +
        `of ${segment.audio.startTime} seconds for a duration of ${segment.audio.duration}  ` +
        'seconds because that segment audio file already exists.'
    )
  }

  if (!(await aws.s3.checkFileExists(episode.segmentsBucket, segment.audio.mp3))) {
    await aws.transcode.createJob(
      pipelineId,
      episode.audio.mp3,
      segment.audio.mp3,
      episode.bucket,
      segment.audio.startTime,
      segment.audio.duration,
      AWS_TRANSCODE_PRESETS.MP3
    )
    await job.log(
      `Started a MP3 transcode job to split ${episode.audio.mp3} at a start time ` +
        `of ${segment.audio.startTime} seconds for a duration of ${segment.audio.duration} seconds.`
    )
    jobStarted = true
  } else {
    await job.log(
      `Skipping MP3 transcode job to split ${episode.audio.mp3} at a start time ` +
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
