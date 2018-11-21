import {
  aws,
  google,
  GoogleSpeechJobId,
  IGoogleTranscription,
  IGoogleTranscriptionWord,
  ITranscript,
} from '@boombox/shared'
import { ENV, EpisodeJob, ISegment, ITranscriptionJob } from './episode'
import { Lambda } from './lambda'
import { normalizeGoogleTranscription } from './normalized'

export const getRawTranscription = async <T extends IGoogleTranscriptionWord>(
  episode: EpisodeJob,
  segment: ISegment,
  job: ITranscriptionJob
): Promise<IGoogleTranscription> => {
  const bucket = episode.transcriptionsBucket
  const rawFilename = job.rawTranscriptFilename
  let transcription: IGoogleTranscription | undefined
  if (!(await aws.s3.checkFileExists(bucket, rawFilename))) {
    if (job.jobName) {
      const jobResponse = await google.transcribe.getTranscriptionJob(job.jobName)
      if (jobResponse.done && !jobResponse.error && jobResponse.response) {
        transcription = jobResponse.response as IGoogleTranscription
        await aws.s3.putJsonFile(bucket, rawFilename, transcription)
      }
    }
  } else {
    transcription = (await aws.s3.getJsonFile(bucket, rawFilename)) as IGoogleTranscription
  }

  if (!transcription) {
    throw Error(`Cannot get raw transcription for segment: ${segment.audio.filename}`)
  }

  return transcription
}

export const getNormalizedTranscription = async <T extends IGoogleTranscriptionWord>(
  episode: EpisodeJob,
  segment: ISegment,
  job: ITranscriptionJob
): Promise<ITranscript> => {
  const bucket = episode.transcriptionsBucket
  const filename = job.normalizedTranscriptFilename
  let transcription: ITranscript | undefined
  if (!(await aws.s3.checkFileExists(bucket, filename))) {
    if (job.jobName) {
      const rawTranscription = await getRawTranscription<T>(episode, segment, job)
      transcription = normalizeGoogleTranscription(rawTranscription, segment.audio.startTime)
      await aws.s3.putJsonFile(bucket, filename, transcription)
    }
  } else {
    transcription = (await aws.s3.getJsonFile(bucket, filename)) as ITranscript
  }

  if (!transcription) {
    throw Error(`Cannot get normalized transcription for segment: ${segment.audio.filename}`)
  }
  return transcription
}

export const transcribeSegment = async (
  episode: EpisodeJob,
  segment: ISegment,
  withSpeakers: boolean
): Promise<GoogleSpeechJobId> => {
  const filename = segment.audio.filename
  const bucket = Lambda.getEnvVariable(ENV.GOOGLE_AUDIO_BUCKET) as string
  const numSpeakers = withSpeakers ? episode.speakers.length : 0
  return await google.transcribe.createTranscriptionJob(bucket, filename, numSpeakers)
}

export const transcriptionProgress = async (
  episode: EpisodeJob,
  segment: ISegment,
  job: ITranscriptionJob
): Promise<number> => {
  let progress = 0
  const bucket = episode.transcriptionsBucket
  const filename = job.normalizedTranscriptFilename
  if (await aws.s3.checkFileExists(bucket, filename)) {
    progress = 100
  } else if (job.jobName) {
    const response = await google.transcribe.getTranscriptionJob(job.jobName)
    if (response && !response.error) {
      const progressPercent = response.metadata.progressPercent
      progress = response.done ? 100 : progressPercent ? progressPercent : 0
    } else {
      throw Error(`Job ${job.jobName} failed.`)
    }
  } else {
    throw Error('No job found for: ' + filename)
  }
  return progress
}
