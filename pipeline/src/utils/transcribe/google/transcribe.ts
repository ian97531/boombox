import { aws, google, GoogleSpeechJobId, ITranscript } from '@boombox/shared'

import { ENV, EpisodeJob, ISegment } from '../../episode'
import { Lambda } from '../../lambda'
import { GoogleTranscription } from './GoogleTranscription'

export const getEpisodeTranscriptions = async (episode: EpisodeJob): Promise<ITranscript[]> => {
  const transcriptions: ITranscript[] = []
  const bucket = episode.transcriptionsBucket

  for (const segment of episode.segments) {
    const filename = segment.transcription.google.normalizedFilename
    const rawFilename = segment.transcription.google.rawFilename
    let transcription: ITranscript | undefined

    if (!(await aws.s3.checkFileExists(bucket, filename))) {
      if (segment.transcription.google.jobName) {
        const jobName = segment.transcription.google.jobName as GoogleSpeechJobId
        const job = await google.transcribe.getTranscriptionJob(jobName)
        if (job.done && !job.error && job.response) {
          const rawTranscription = job.response
          await aws.s3.putJsonFile(bucket, rawFilename, rawTranscription)

          const googleTranscription = new GoogleTranscription(
            rawTranscription,
            segment.audio.startTime
          )
          transcription = googleTranscription.getNormalizedTranscription()
          await aws.s3.putJsonFile(bucket, filename, transcription)
        }
      }
    } else {
      transcription = (await aws.s3.getJsonFile(bucket, filename)) as ITranscript
    }

    if (!transcription) {
      throw Error(`Cannot get transcription for segment: ${segment.audio.filename}`)
    }

    transcriptions.push(transcription)
  }

  return transcriptions
}

export const getUntranscribedSegments = async (episode: EpisodeJob): Promise<ISegment[]> => {
  const untranscribedSegments: ISegment[] = []

  for (const segment of episode.segments) {
    const fileExists = await aws.s3.checkFileExists(
      episode.transcriptionsBucket,
      segment.transcription.google.normalizedFilename
    )
    let transcriptionExists = false
    if (segment.transcription.google.jobName) {
      try {
        const jobName = segment.transcription.google.jobName as GoogleSpeechJobId
        const job = await google.transcribe.getTranscriptionJob(jobName)
        if (job.done && !job.error && job.response) {
          transcriptionExists = true
        } else {
          transcriptionExists = false
        }
      } catch (error) {
        transcriptionExists = false
      }
    } else {
      transcriptionExists = false
    }

    if (!fileExists && !transcriptionExists) {
      untranscribedSegments.push(segment)
    }
  }
  return untranscribedSegments
}

export const transcribeSegment = async (episode: EpisodeJob, segment: ISegment): Promise<void> => {
  const filename = segment.audio.filename
  const bucket = Lambda.getEnvVariable(ENV.GOOGLE_AUDIO_BUCKET) as string
  const numSpeakers = episode.speakers.length
  const jobId = await google.transcribe.createTranscriptionJob(bucket, filename, numSpeakers)
  segment.transcription.google.jobName = jobId
}

export const transcriptionsReadyToBeNormalized = async (episode: EpisodeJob): Promise<number> => {
  let transcriptionsReady = 0
  let erroredJobs = 0
  const bucket = episode.transcriptionsBucket
  for (const segment of episode.segments) {
    if (await aws.s3.checkFileExists(bucket, segment.transcription.google.normalizedFilename)) {
      transcriptionsReady += 1
    } else {
      if (segment.transcription.google.jobName) {
        const jobName = segment.transcription.google.jobName as GoogleSpeechJobId
        try {
          const response = await google.transcribe.getTranscriptionJob(jobName)
          if (response.done && !response.error) {
            transcriptionsReady += 1
          } else if (response.done && response.error) {
            erroredJobs += 1
          }
        } catch (error) {
          console.log(`No transcription job found for ${jobName}`)
        }
      }
    }
  }
  if (erroredJobs) {
    throw Error(`${erroredJobs} segment transcription job(s) encountered an error.`)
  }

  return transcriptionsReady
}
