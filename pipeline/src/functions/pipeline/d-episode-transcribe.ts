import { aws } from '@boombox/shared'
import { episodeNormalize } from 'functions/pipeline/e-episode-normalize'
import { ENV, episodeCaller, episodeHandler, EpisodeJob } from 'utils/episode'
import { Job } from 'utils/job'
import { Lambda } from 'utils/lambda'
import { aws as awsTranscribe, watson as watsonTranscribe } from 'utils/transcribe'

const episodeTranscribeHandler = async (lambda: Lambda, job: Job, episode: EpisodeJob) => {
  let completeSegments = 0

  for (const segment of episode.segments) {
    const segmentComplete = await aws.s3.checkFileExists(
      episode.segmentsBucket,
      segment.audio.filename
    )
    if (segmentComplete) {
      completeSegments += 1
    }
  }

  if (episode.segments.length === completeSegments) {
    await job.log('All segments have completed transcoding.')
    const awsSegments = await awsTranscribe.getUntranscribedSegments(episode)
    for (const segment of awsSegments) {
      await job.log(`Starting an AWS transcription job for ${segment.audio.filename}`)
      await awsTranscribe.transcribeSegment(episode, segment)
    }
    await job.log(
      `Started transcribing ${awsSegments.length} of ${episode.segments.length} segments with AWS.`
    )

    const watsonSegments = await watsonTranscribe.getUntranscribedSegments(episode)
    for (const segment of watsonSegments) {
      await job.log(`Starting a Watson transcription job for ${segment.audio.filename}`)
      await watsonTranscribe.transcribeSegment(episode, segment)
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
