import { aws, google } from '@boombox/shared'
import { ENV, episodeCaller, episodeHandler, EpisodeJob } from '../../utils/episode'
import { Job } from '../../utils/job'
import { Lambda } from '../../utils/lambda'
import { appendAllTranscriptions, getStatements } from '../../utils/normalized'
import { getEpisodeTranscriptions, transcriptionsReadyToBeNormalized } from '../../utils/transcribe'
import { episodeTranscribe } from './d-episode-transcribe'
import { episodeInsert } from './f-episode-insert'

const episodeNormalizeHandler = async (lambda: Lambda, job: Job, episode: EpisodeJob) => {
  let segmentsComplete = 0
  let transcriptionErrors = false
  const totalSegments = episode.segments.length

  try {
    segmentsComplete = await transcriptionsReadyToBeNormalized(episode)
    await job.log(`${segmentsComplete} of ${totalSegments} Google transcriptions are complete.`)
  } catch (error) {
    await job.logError('Error while checking if the transcriptions are ready.', error)
    transcriptionErrors = true
  }

  if (segmentsComplete === totalSegments) {
    await job.log('Deleting the segment flac files in GCP.')
    episode.segments.forEach(segment => {
      const bucket = Lambda.getEnvVariable(ENV.GOOGLE_AUDIO_BUCKET) as string
      const filename = segment.audio.filename
      google.storage.deleteFile(bucket, filename)
    })

    await job.log(`Fetching the transcriptions for ${episode.podcastSlug} ${episode.slug}.`)
    const googleTranscriptions = await getEpisodeTranscriptions(episode)

    await job.log(`Zipping ${googleTranscriptions.length} segments into a single transcription.`)
    const googleTranscription = appendAllTranscriptions(googleTranscriptions)
    await aws.s3.putJsonFile(episode.bucket, episode.transcriptions.final, googleTranscription)

    await job.log('Creating statements from the transcription.')
    const statements = getStatements(googleTranscription)
    await aws.s3.putJsonFile(episode.bucket, episode.transcriptions.insertQueue, statements)

    episodeInsert(lambda, job, episode)
  } else if (transcriptionErrors) {
    await job.log('Calling the transcribe lambda to re-transcribe the segments with errors.')
    episodeTranscribe(lambda, job, episode)
  } else {
    await job.log('Waiting for the transcription jobs to finish')
    episodeNormalize(lambda, job, episode, 120)
  }
}

export const episodeNormalize = episodeCaller(ENV.EPISODE_NORMALIZE_QUEUE)
export const handler = episodeHandler(episodeNormalizeHandler)
