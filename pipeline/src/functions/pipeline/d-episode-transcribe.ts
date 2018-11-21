import { aws, google } from '@boombox/shared'
import { ENV, episodeCaller, episodeHandler, EpisodeJob } from '../../utils/episode'
import { Job } from '../../utils/job'
import { Lambda } from '../../utils/lambda'
import { transcribeSegment } from '../../utils/transcribe'
import { episodeNormalize } from './e-episode-normalize'

const episodeTranscribeHandler = async (lambda: Lambda, job: Job, episode: EpisodeJob) => {
  let transcodedSegements = 0
  let transcriptionsStarted = 0

  for (const segment of episode.segments) {
    const segmentComplete = await aws.s3.checkFileExists(
      episode.segmentsBucket,
      segment.audio.filename
    )
    if (segmentComplete) {
      transcodedSegements += 1
    }
  }

  if (episode.segments.length === transcodedSegements) {
    await job.log('All segments have completed transcoding.')
    for (const segment of episode.segments) {
      const speakerTranscriptionFilename = segment.speakerTranscription.rawTranscriptFilename
      const speakerTranscriptionExists = await aws.s3.checkFileExists(
        episode.transcriptionsBucket,
        speakerTranscriptionFilename
      )

      const wordTranscriptionFilename = segment.wordTranscription.rawTranscriptFilename
      const wordTranscriptionExists = await aws.s3.checkFileExists(
        episode.transcriptionsBucket,
        wordTranscriptionFilename
      )

      await job.log(
        `Word Transcription exists: ${wordTranscriptionExists}. Speaker Transcription exists: ${speakerTranscriptionExists}`
      )
      if (!speakerTranscriptionExists || !wordTranscriptionExists) {
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

        if (!speakerTranscriptionExists) {
          await job.log(`Starting a speaker transcription job for ${segment.audio.filename}`)
          segment.speakerTranscription.jobName = await transcribeSegment(episode, segment, true)
          transcriptionsStarted += 1
        }

        if (!wordTranscriptionExists) {
          await job.log(`Starting a word transcription job for ${segment.audio.filename}`)
          segment.wordTranscription.jobName = await transcribeSegment(episode, segment, false)
          transcriptionsStarted += 1
        }
      }
    }
    await job.log(`Started ${transcriptionsStarted} transcriptions with Google.`)

    const delay = transcriptionsStarted ? 120 : 0
    episodeNormalize(lambda, job, episode, delay)
  } else {
    await job.log(
      `Waiting for ${episode.segments.length - transcodedSegements} segments to be transcoded.`
    )
    episodeTranscribe(lambda, job, episode, 60)
  }
}

export const episodeTranscribe = episodeCaller(ENV.EPISODE_TRANSCRIBE_QUEUE)
export const handler = episodeHandler(episodeTranscribeHandler)
