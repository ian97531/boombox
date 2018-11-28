import {
  SpeakerLabelsResult,
  SpeechRecognitionResult,
  SpeechRecognitionResults,
} from 'watson-developer-cloud/speech-to-text/v1-generated'

import {
  aws,
  ITranscript,
  IWatsonWord,
  watson,
  WATSON_TRANSCRIBE_STATUS,
  WatsonJobId,
} from '@boombox/shared'
import { EpisodeJob, ISegment } from '../episode'

enum WATSON_TRANSCRIPTION {
  CONTENT = 0,
  CONFIDENCE = 1,
  START_TIME = 1,
  END_TIME = 2,
}

const INVALID_CONTENT = ['%HESITATION']

class WatsonTranscription {
  private speakers: number[]
  private items: SpeechRecognitionResult[]
  private segmentIndex = 0
  private wordIndex = 0
  private startTime = 0

  constructor(result: SpeechRecognitionResults, startTime: number = 0) {
    if (result.results && result.speaker_labels) {
      this.speakers = this.normalizeSpeakers(result.speaker_labels)
      this.items = result.results
    } else {
      throw Error('Results or Speaker Labels are missing from the transcription results')
    }
    this.startTime = startTime
  }

  public getNormalizedTranscription(): ITranscript {
    const normalizedTranscription: ITranscript = []

    for (const speaker of this.speakers) {
      const word = this.getNextWord()
      if (word) {
        normalizedTranscription.push({
          content: word.content,
          endTime: word.endTime + this.startTime,
          speaker,
          startTime: word.startTime + this.startTime,
        })
      }
    }

    return normalizedTranscription
  }

  private normalizeSpeakers(speakers: SpeakerLabelsResult[]): number[] {
    const output: number[] = []
    const speakerValues: {
      [key: number]: boolean
    } = {}

    for (const speaker of speakers) {
      speakerValues[speaker.speaker] = true
    }

    const speakerKeys = Object.keys(speakerValues)

    for (const speaker of speakers) {
      output.push(speakerKeys.indexOf(speaker.speaker.toString()))
    }

    return output
  }

  private getNextWord(): IWatsonWord | undefined {
    let output: IWatsonWord | undefined
    let done = false
    while (!output && !done) {
      if (this.segmentIndex < this.items.length) {
        if (this.items[this.segmentIndex].alternatives[0]) {
          const segment = this.items[this.segmentIndex].alternatives[0]
          const word = segment.word_confidence
          const timestamp = segment.timestamps
          if (word && timestamp && this.wordIndex < word.length) {
            if (
              INVALID_CONTENT.indexOf(word[this.wordIndex][WATSON_TRANSCRIPTION.CONTENT]) === -1
            ) {
              output = {
                confidence: parseFloat(word[this.wordIndex][WATSON_TRANSCRIPTION.CONFIDENCE]),
                content: word[this.wordIndex][WATSON_TRANSCRIPTION.CONTENT],
                endTime: parseFloat(timestamp[this.wordIndex][WATSON_TRANSCRIPTION.END_TIME]),
                startTime: parseFloat(timestamp[this.wordIndex][WATSON_TRANSCRIPTION.START_TIME]),
              }
            }
            this.wordIndex += 1
          } else {
            this.segmentIndex += 1
            this.wordIndex = 0
          }
        } else {
          this.segmentIndex += 1
          this.wordIndex = 0
        }
      } else {
        done = true
      }
    }

    return output
  }
}

export const transcriptionComplete = async (
  episode: EpisodeJob,
  segment: ISegment
): Promise<boolean> => {
  const bucket = episode.transcriptionsBucket

  let complete = false
  if (await aws.s3.checkFileExists(bucket, segment.speakerTranscription.rawTranscriptFilename)) {
    complete = true
  } else {
    if (segment.speakerTranscription.jobName) {
      const jobName = segment.speakerTranscription.jobName
      try {
        const response = await watson.transcribe.getTranscriptionJob(jobName)
        if (
          response.results &&
          response.results[0] &&
          response.results[0].results &&
          response.status === WATSON_TRANSCRIBE_STATUS.SUCCESS
        ) {
          complete = true
        } else if (
          response.status === WATSON_TRANSCRIBE_STATUS.SUCCESS ||
          response.status === WATSON_TRANSCRIBE_STATUS.ERROR
        ) {
          throw Error(`Transcription job for ${segment.audio.mp3} encountered an error.`)
        }
      } catch (error) {
        console.log(`No transcription job found for ${jobName}`)
      }
    }
  }

  return complete
}

export const transcribeSegment = async (
  episode: EpisodeJob,
  segment: ISegment
): Promise<WatsonJobId> => {
  const jobName = await watson.transcribe.createTranscriptionJob(
    episode.segmentsBucket,
    segment.audio.mp3
  )
  return jobName
}

export const getNormalizedTranscription = async (
  episode: EpisodeJob,
  segment: ISegment
): Promise<ITranscript> => {
  const bucket = episode.transcriptionsBucket

  const filename = segment.speakerTranscription.normalizedTranscriptFilename
  const rawFilename = segment.speakerTranscription.rawTranscriptFilename
  let transcription: ITranscript | undefined

  if (!(await aws.s3.checkFileExists(bucket, filename))) {
    if (segment.speakerTranscription.jobName) {
      const jobName = segment.speakerTranscription.jobName
      const job = await watson.transcribe.getTranscriptionJob(jobName)
      if (
        job.results &&
        job.results[0] &&
        job.results[0].results &&
        job.status === WATSON_TRANSCRIBE_STATUS.SUCCESS
      ) {
        const rawTranscription = job.results[0]
        await aws.s3.putJsonFile(bucket, rawFilename, rawTranscription)

        const watsonTranscription = new WatsonTranscription(
          rawTranscription,
          segment.audio.startTime
        )
        transcription = watsonTranscription.getNormalizedTranscription()
        await aws.s3.putJsonFile(bucket, filename, transcription)
      }
    }
  } else {
    transcription = (await aws.s3.getJsonFile(bucket, filename)) as ITranscript
  }

  if (!transcription) {
    throw Error(`Cannot get transcription for segment: ${segment.audio.mp3}`)
  }

  return transcription
}

export const getUntranscribedSegments = async (episode: EpisodeJob): Promise<ISegment[]> => {
  const untranscribedSegments: ISegment[] = []

  for (const segment of episode.segments) {
    const fileExists = await aws.s3.checkFileExists(
      episode.transcriptionsBucket,
      segment.speakerTranscription.normalizedTranscriptFilename
    )
    let transcriptionExists = false
    if (segment.speakerTranscription.jobName) {
      try {
        const job = await watson.transcribe.getTranscriptionJob(
          segment.speakerTranscription.jobName
        )
        if (job.status === WATSON_TRANSCRIBE_STATUS.ERROR) {
          transcriptionExists = false
        } else if (job.results && !job.results[0].results) {
          transcriptionExists = false
        } else {
          transcriptionExists = true
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
