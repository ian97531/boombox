import { checkFileExists } from '../../utils/aws/s3'
import { ENV, episodeCaller, episodeHandler, EpisodeJob } from '../../utils/episode'
import { Job } from '../../utils/job'
import { Lambda } from '../../utils/lambda'
import { episodeTranscribeStart } from './e-episode-transcribe-start'

const episodeSegmentCompleteHandler = async (lambda: Lambda, job: Job, episode: EpisodeJob) => {
  let completeSegments = 0

  for (const segment of episode.segments) {
    const segmentComplete = await checkFileExists(episode.bucket, segment.audio.filename)
    if (segmentComplete) {
      completeSegments += 1
    }
  }

  if (episode.segments.length === completeSegments) {
    await job.log(`All ${episode.segments.length} segments are ready to be transcribed.`)
    episodeTranscribeStart(lambda, job, episode)
  } else {
    await job.log(
      `Waiting for ${episode.segments.length - completeSegments} segments to be transcribed.`
    )
    episodeSegmentComplete(lambda, job, episode, 60)
  }
}

export const episodeSegmentComplete = episodeCaller(ENV.EPISODE_SEGMENT_COMPLETE_QUEUE)
export const handler = episodeHandler(episodeSegmentCompleteHandler)
