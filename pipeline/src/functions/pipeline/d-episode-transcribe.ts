import { aws, google } from '@boombox/shared'
import { ENV, episodeCaller, episodeHandler, EpisodeJob } from '../../utils/episode'
import { Job } from '../../utils/job'
import { Lambda } from '../../utils/lambda'
import { getUntranscribedSegments, transcribeSegment } from '../../utils/transcribe'
import { episodeNormalize } from './e-episode-normalize'

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
    const googleSegments = await getUntranscribedSegments(episode)
    for (const segment of googleSegments) {
      const awsBucket = episode.segmentsBucket
      const awsFilename = segment.audio.filename
      const googleBucket = Lambda.getEnvVariable(ENV.GOOGLE_AUDIO_BUCKET) as string

      const exists = await google.storage.fileExists(googleBucket, awsFilename)
      if (!exists) {
        await job.log(
          `Starting to move s3://${awsBucket}/${awsFilename} to gs://${googleBucket}/${awsFilename}.`
        )
        await google.storage.streamFileFromS3ToGoogleCloudStorage(
          awsBucket,
          awsFilename,
          googleBucket
        )
        await job.log(
          `Completed moving s3://${awsBucket}/${awsFilename} to gs://${googleBucket}/${awsFilename}.`
        )
      }
      await google.storage.makeFilePublic(googleBucket, awsFilename)
      await job.log(`Starting a Google transcription job for ${segment.audio.filename}`)
      segment.transcription.jobName = await transcribeSegment(episode, segment)
    }
    await job.log(
      `Started transcribing ${googleSegments.length} of ${
        episode.segments.length
      } segments with Google.`
    )

    const delay = googleSegments.length ? 120 : 0
    episodeNormalize(lambda, job, episode, delay)
  } else {
    await job.log(
      `Waiting for ${episode.segments.length - completeSegments} segments to be transcoded.`
    )
    episodeTranscribe(lambda, job, episode, 60)
  }
}

export const episodeTranscribe = episodeCaller(ENV.EPISODE_TRANSCRIBE_QUEUE)
export const handler = episodeHandler(episodeTranscribeHandler)
