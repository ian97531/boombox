import { aws, ITranscript } from '@boombox/shared'
import { ENV, episodeCaller, episodeHandler, EpisodeJob } from '../../utils/episode'
import { Job } from '../../utils/job'
import { Lambda } from '../../utils/lambda'
import {
  getNormalizedTranscription as googleGetTranscription,
  transcriptionProgress as googleTranscriptionProgress,
} from '../../utils/transcribe-services/google'
import {
  getNormalizedTranscription as watsonGetTranscription,
  transcriptionComplete as watsonTranscriptionComplete,
} from '../../utils/transcribe-services/watson'
import {
  concatSegmentTranscriptions,
  copySpeakersFromTranscription,
  getStatements,
} from '../../utils/transcript'
import { episodeInsert } from './f-episode-insert'

const episodeNormalizeHandler = async (lambda: Lambda, job: Job, episode: EpisodeJob) => {
  let segmentsTranscribed = 0
  const totalSegments = episode.segments.length

  for (const segment of episode.segments) {
    const googleProgress = await googleTranscriptionProgress(episode, segment)
    await job.log(`Google transcription of ${segment.audio.flac} is ${googleProgress}% complete.`)

    const watsonComplete = await watsonTranscriptionComplete(episode, segment)
    await job.log(
      `Watson transcription of ${segment.audio.mp3} is ${watsonComplete ? '' : 'not '}complete.`
    )

    if (googleProgress === 100 && watsonComplete) {
      segmentsTranscribed += 1
    }
  }

  if (segmentsTranscribed === totalSegments) {
    const speakerTranscriptions: ITranscript[] = []
    const wordTranscriptions: ITranscript[] = []

    for (const segment of episode.segments) {
      await job.log(`Fetching the transcriptions for ${episode.podcastSlug} ${episode.slug}.`)
      speakerTranscriptions.push(await watsonGetTranscription(episode, segment))
      wordTranscriptions.push(await googleGetTranscription(episode, segment))
    }

    await job.log(`Zipping ${speakerTranscriptions.length} segments into a single transcription.`)
    const speakerTranscription = concatSegmentTranscriptions(speakerTranscriptions)
    const wordTranscription = concatSegmentTranscriptions(wordTranscriptions)
    const finalTranscription = copySpeakersFromTranscription(
      speakerTranscription,
      wordTranscription
    )
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
