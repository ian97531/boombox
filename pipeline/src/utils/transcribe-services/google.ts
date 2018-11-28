import {
  aws,
  google,
  GoogleSpeechJobId,
  IGoogleTranscription,
  IGoogleTranscriptionSpeakerTag,
  IGoogleTranscriptionWord,
  ITranscript,
} from '@boombox/shared'
import { ENV, EpisodeJob, ISegment } from '../episode'
import { Lambda } from '../lambda'

class GoogleTranscription {
  private words: IGoogleTranscriptionWord[]
  private startTime = 0
  private speakers: number[] = []

  constructor(transcription: IGoogleTranscription, startTime: number = 0) {
    const lastResult = transcription.results[transcription.results.length - 1]
    if (lastResult.alternatives[0].words[0].speakerTag !== undefined) {
      this.words = transcription.results[transcription.results.length - 1].alternatives[0].words
    } else {
      this.words = transcription.results.reduce((accumulated, resultSet) => {
        return [...accumulated, ...resultSet.alternatives[0].words]
      }, [])
    }

    this.startTime = startTime
  }

  public getNormalizedTranscription(): ITranscript {
    const normalizedTranscription: ITranscript = this.words.map((item, index) => {
      return {
        confidence: 1,
        content: item.word,
        endTime: this.timecodeToSeconds(item.endTime),
        speaker: this.getSpeakerforTag(item.speakerTag),
        startTime: this.timecodeToSeconds(item.startTime),
      }
    })
    return normalizedTranscription
  }

  private getSpeakerforTag(speakerTag?: IGoogleTranscriptionSpeakerTag): number {
    if (speakerTag) {
      if (this.speakers.indexOf(speakerTag) === -1) {
        this.speakers.push(speakerTag)
      }
      return this.speakers.indexOf(speakerTag)
    } else {
      return 0
    }
  }

  private timecodeToSeconds(timecode: string): number {
    return parseFloat(timecode) + this.startTime
  }
}

export const normalizeGoogleTranscription = (
  transcript: IGoogleTranscription,
  startTime: number = 0
): ITranscript => {
  const transcription = new GoogleTranscription(transcript, startTime)
  return transcription.getNormalizedTranscription()
}

export const getRawTranscription = async (
  episode: EpisodeJob,
  segment: ISegment
): Promise<IGoogleTranscription> => {
  const bucket = episode.transcriptionsBucket
  const job = segment.wordTranscription
  const rawFilename = job.rawTranscriptFilename
  let transcription: IGoogleTranscription | undefined
  if (!(await aws.s3.checkFileExists(bucket, rawFilename))) {
    if (job.jobName) {
      const jobResponse = await google.transcribe.getTranscriptionJob(job.jobName)
      if (jobResponse.done && !jobResponse.error && jobResponse.response) {
        transcription = jobResponse.response as IGoogleTranscription
        await aws.s3.putJsonFile(bucket, rawFilename, transcription)

        const googleBucket = Lambda.getEnvVariable(ENV.GOOGLE_AUDIO_BUCKET) as string
        const flacFile = segment.audio.flac
        google.storage.deleteFile(googleBucket, flacFile)
      }
    }
  } else {
    transcription = (await aws.s3.getJsonFile(bucket, rawFilename)) as IGoogleTranscription
  }

  if (!transcription) {
    throw Error(`Cannot get raw transcription for segment: ${segment.audio.mp3}`)
  }

  return transcription
}

export const getNormalizedTranscription = async (
  episode: EpisodeJob,
  segment: ISegment
): Promise<ITranscript> => {
  const bucket = episode.transcriptionsBucket
  const job = segment.wordTranscription
  const filename = job.normalizedTranscriptFilename
  let transcription: ITranscript | undefined
  if (!(await aws.s3.checkFileExists(bucket, filename))) {
    if (job.jobName) {
      const rawTranscription = await getRawTranscription(episode, segment)
      transcription = normalizeGoogleTranscription(rawTranscription, segment.audio.startTime)
      await aws.s3.putJsonFile(bucket, filename, transcription)
    }
  } else {
    transcription = (await aws.s3.getJsonFile(bucket, filename)) as ITranscript
  }

  if (!transcription) {
    throw Error(`Cannot get normalized transcription for segment: ${segment.audio.mp3}`)
  }
  return transcription
}

export const transcribeSegment = async (
  episode: EpisodeJob,
  segment: ISegment
): Promise<GoogleSpeechJobId> => {
  const filename = segment.audio.flac
  const bucket = Lambda.getEnvVariable(ENV.GOOGLE_AUDIO_BUCKET) as string
  return await google.transcribe.createTranscriptionJob(bucket, filename)
}

export const transcriptionProgress = async (
  episode: EpisodeJob,
  segment: ISegment
): Promise<number> => {
  let progress = 0
  const bucket = episode.transcriptionsBucket
  const job = segment.wordTranscription
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
