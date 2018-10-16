import { checkFileExists } from '@boombox/shared/src/utils/aws/s3'
import { ENV, episodeCaller, episodeHandler, EpisodeJob } from '../../utils/episode'
import { Job } from '../../utils/job'
import { Lambda } from '../../utils/lambda'
import { aws, watson } from '../../utils/transcribe'
import { episodeNormalize } from './e-episode-normalize'

const episodeTranscribeHandler = async (lambda: Lambda, job: Job, episode: EpisodeJob) => {
  let completeSegments = 0

  for (const segment of episode.segments) {
    const segmentComplete = await checkFileExists(episode.segmentsBucket, segment.audio.filename)
    if (segmentComplete) {
      completeSegments += 1
    }
  }

  if (episode.segments.length === completeSegments) {
    await job.log('All segments have completed transcoding.')
    const awsSegments = await aws.getUntranscribedSegments(episode)
    for (const segment of awsSegments) {
      await job.log(`Starting an AWS transcription job for ${segment.audio.filename}`)
      await aws.transcribeSegment(episode, segment)
    }
    await job.log(
      `Started transcribing ${awsSegments.length} of ${episode.segments.length} segments with AWS.`
    )

    const watsonSegments = await watson.getUntranscribedSegments(episode)
    for (const segment of watsonSegments) {
      await job.log(`Starting a Watson transcription job for ${segment.audio.filename}`)
      await watson.transcribeSegment(episode, segment)
    }
    await job.log(
      `Started transcribing ${watsonSegments.length} of ${
        episode.segments.length
      } segments with AWS.`
    )

    const delay = awsSegments.length || watsonSegments.length ? 120 : 0
    episodeNormalize(lambda, job, episode, delay)
  } else {
    await job.log(
      `Waiting for ${episode.segments.length - completeSegments} segments to be transcribed.`
    )
    episodeTranscribe(lambda, job, episode, 60)
  }
}

export const episodeTranscribe = episodeCaller(ENV.EPISODE_TRANSCRIBE_QUEUE)
export const handler = episodeHandler(episodeTranscribeHandler)
