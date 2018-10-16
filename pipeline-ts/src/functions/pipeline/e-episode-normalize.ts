import { putJsonFile } from '@boombox/shared/src/utils/aws/s3'
import { ENV, episodeCaller, episodeHandler, EpisodeJob } from '../../utils/episode'
import { Job } from '../../utils/job'
import { Lambda } from '../../utils/lambda'
import { aws, normalized, watson } from '../../utils/transcribe'
import { episodeTranscribe } from './d-episode-transcribe'
import { episodeInsert } from './f-episode-insert'

const episodeNormalizeHandler = async (lambda: Lambda, job: Job, episode: EpisodeJob) => {
  let awsComplete = 0
  let watsonComplete = 0
  let transcriptionErrors = false
  const totalSegments = episode.segments.length

  try {
    awsComplete = await aws.transcriptionsReadyToBeNormalized(episode)
    watsonComplete = await watson.transcriptionsReadyToBeNormalized(episode)
    await job.log(`${awsComplete} of ${totalSegments} AWS transcriptions are complete.`)
    await job.log(`${watsonComplete} of ${totalSegments} Watson transcriptions are complete.`)
  } catch (error) {
    await job.logError('Error while checking if the transcriptions are ready.', error)
    transcriptionErrors = true
  }

  if (awsComplete === totalSegments && watsonComplete === totalSegments) {
    await job.log(`Fetching the transcriptions for ${episode.podcastSlug} ${episode.slug}.`)
    const awsTranscriptions = await aws.getEpisodeTranscriptions(episode)
    const watsonTranscriptions = await watson.getEpisodeTranscriptions(episode)

    await job.log(`Zipping ${awsTranscriptions.length} segments into a single transcription.`)
    const awsTranscription = normalized.appendAllTranscriptions(awsTranscriptions)
    const watsonTranscription = normalized.appendAllTranscriptions(watsonTranscriptions)
    await putJsonFile(episode.bucket, episode.transcriptions.aws, awsTranscription)
    await putJsonFile(episode.bucket, episode.transcriptions.watson, watsonTranscription)

    await job.log('Combining the AWS and Watson transcriptions.')
    const finalTranscription = normalized.combineTranscriptions(
      awsTranscription,
      watsonTranscription
    )
    await putJsonFile(episode.bucket, episode.transcriptions.final, finalTranscription)
    await putJsonFile(episode.bucket, episode.transcriptions.insertQueue, finalTranscription)

    episodeInsert(lambda, job, episode)
  } else if (transcriptionErrors) {
    // If there were transcription errors, that means some segments need to be re-transcribed.
    await job.log('Calling the transcribe lambda to re-transcribe the segments with errors.')
    episodeTranscribe(lambda, job, episode)
  } else {
    // Otherwise, we just need to keep waiting for the transcription jobs to finish.
    await job.log('Waiting for the transcription jobs to finish')
    episodeNormalize(lambda, job, episode, 120)
  }
}

export const episodeNormalize = episodeCaller(ENV.EPISODE_NORMALIZE_QUEUE)
export const handler = episodeHandler(episodeNormalizeHandler)
