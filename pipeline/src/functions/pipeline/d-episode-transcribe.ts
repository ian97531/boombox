import { aws, google } from '@boombox/shared'
import { ENV, episodeCaller, episodeHandler, EpisodeJob } from '../../utils/episode'
import { Job } from '../../utils/job'
import { Lambda } from '../../utils/lambda'
import { transcribeSegment as googleTranscribeSegment } from '../../utils/transcribe-services/google'
import { transcribeSegment as watsonTranscribeSegment } from '../../utils/transcribe-services/watson'
import { episodeNormalize } from './e-episode-normalize'

const episodeTranscribeHandler = async (lambda: Lambda, job: Job, episode: EpisodeJob) => {
  let transcodedSegements = 0
  let transcriptionsStarted = 0

  for (const segment of episode.segments) {
    const mp3Complete = await aws.s3.checkFileExists(episode.segmentsBucket, segment.audio.mp3)
    const flacComplete = await aws.s3.checkFileExists(episode.segmentsBucket, segment.audio.flac)
    if (mp3Complete && flacComplete) {
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

      if (!speakerTranscriptionExists || !wordTranscriptionExists) {
        const awsBucket = episode.segmentsBucket

        if (!speakerTranscriptionExists) {
          await job.log(`Starting a Watson transcription job with for ${segment.audio.mp3}`)
          segment.speakerTranscription.jobName = await watsonTranscribeSegment(episode, segment)
          transcriptionsStarted += 1
          await job.log(
            `Started a Watson transcription job with id ${segment.speakerTranscription.jobName}`
          )
        }

        if (!wordTranscriptionExists) {
          const awsFilename = segment.audio.flac
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
          await job.log(`Starting a word transcription job with Google for ${segment.audio.flac}`)
          segment.wordTranscription.jobName = await googleTranscribeSegment(episode, segment)
          await job.log(
            `Started a Google transcription job with id ${segment.wordTranscription.jobName}`
          )
          transcriptionsStarted += 1
        }
      }
    }
    await job.log(`Started ${transcriptionsStarted} transcriptions.`)

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
