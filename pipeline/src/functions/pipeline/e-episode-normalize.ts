import { aws, google, ITranscript } from '@boombox/shared'
import { ENV, episodeCaller, episodeHandler, EpisodeJob } from '../../utils/episode'
import { Job } from '../../utils/job'
import { Lambda } from '../../utils/lambda'
import {
  appendAllTranscriptions,
  combineTranscriptions,
  getStatements,
} from '../../utils/normalized'
import { getNormalizedTranscription, transcriptionProgress } from '../../utils/transcribe'
import { episodeInsert } from './f-episode-insert'

const episodeNormalizeHandler = async (lambda: Lambda, job: Job, episode: EpisodeJob) => {
  let segmentsTranscribed = 0
  const totalSegments = episode.segments.length

  for (const segment of episode.segments) {
    const speakerProgress = await transcriptionProgress(
      episode,
      segment,
      segment.speakerTranscription
    )
    await job.log(
      `Speaker transcription of ${segment.audio.filename} is ${speakerProgress}% complete.`
    )
    const wordProgress = await transcriptionProgress(episode, segment, segment.wordTranscription)
    await job.log(`Word transcription of ${segment.audio.filename} is ${wordProgress}% complete.`)

    if (speakerProgress === 100 && wordProgress === 100) {
      segmentsTranscribed += 1
    }
  }

  if (segmentsTranscribed === totalSegments) {
    await job.log('Deleting the segment flac files in GCP.')
    const speakerTranscriptions: ITranscript[] = []
    const wordTranscriptions: ITranscript[] = []

    for (const segment of episode.segments) {
      const bucket = Lambda.getEnvVariable(ENV.GOOGLE_AUDIO_BUCKET) as string
      const filename = segment.audio.filename
      google.storage.deleteFile(bucket, filename)

      await job.log(`Fetching the transcriptions for ${episode.podcastSlug} ${episode.slug}.`)
      speakerTranscriptions.push(
        await getNormalizedTranscription(episode, segment, segment.speakerTranscription)
      )
      wordTranscriptions.push(
        await getNormalizedTranscription(episode, segment, segment.wordTranscription)
      )
    }

    await job.log(`Zipping ${speakerTranscriptions.length} segments into a single transcription.`)
    const speakerTranscription = appendAllTranscriptions(speakerTranscriptions)
    const wordTranscription = appendAllTranscriptions(wordTranscriptions)
    const finalTranscription = combineTranscriptions(speakerTranscription, wordTranscription)
    await aws.s3.putJsonFile(episode.bucket, episode.transcriptions.final, finalTranscription)

    await job.log('Creating statements from the transcription.')
    const statements = getStatements(finalTranscription)
    await aws.s3.putJsonFile(episode.bucket, episode.transcriptions.insertQueue, statements)

    episodeInsert(lambda, job, episode)
  } else {
    await job.log('Waiting for segment transcription jobs to finish')
    episodeNormalize(lambda, job, episode, 120)
  }
}

export const episodeNormalize = episodeCaller(ENV.EPISODE_NORMALIZE_QUEUE)
export const handler = episodeHandler(episodeNormalizeHandler)
