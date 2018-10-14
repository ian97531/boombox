import { ITranscript } from '@boombox/shared/src/types/models/transcript'
import {
  SpeakerLabelsResult,
  SpeechRecognitionResult,
  SpeechRecognitionResults,
} from 'watson-developer-cloud/speech-to-text/v1-generated'
import { IWatsonWord } from '../../types/watson'

enum WATSON_TRANSCRIPTION {
  CONTENT = 0,
  CONFIDENCE = 1,
  START_TIME = 1,
  END_TIME = 2,
}

const INVALID_CONTENT = ['%HESITATION']

export class WatsonTranscription {
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
          ...word,
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
