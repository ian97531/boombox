import { ITranscript } from '@boombox/shared'

type ISpeakerTag = number

interface IGoogleTranscriptionTimecode {
  seconds?: string
  nanos?: number
}

interface IGoogleTranscriptionWord {
  startTime: IGoogleTranscriptionTimecode
  endTime: IGoogleTranscriptionTimecode
  word: string
  speakerTag: ISpeakerTag
}

interface IGoogleTranscriptionAlternative {
  transcript: string
  confidence: number
  words: IGoogleTranscriptionWord[]
}

interface IGoogleTranscriptionResult {
  alternatives: IGoogleTranscriptionAlternative[]
}

interface IGoogleTranscription {
  results: IGoogleTranscriptionResult[]
}

export class GoogleTranscription {
  private words: IGoogleTranscriptionWord[]
  private startTime = 0
  private speakers: number[] = []

  constructor(transcription: IGoogleTranscription, startTime: number = 0) {
    this.words = transcription.results[transcription.results.length - 1].alternatives[0].words
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

  private getSpeakerforTag(speakerTag: ISpeakerTag): number {
    if (this.speakers.indexOf(speakerTag) === -1) {
      this.speakers.push(speakerTag)
    }
    return this.speakers.indexOf(speakerTag)
  }

  private timecodeToSeconds(timecode: IGoogleTranscriptionTimecode): number {
    const seconds = timecode.seconds ? parseInt(timecode.seconds, 10) : 0
    const nanos = timecode.nanos ? timecode.nanos / 1000000000 : 0
    return seconds + nanos + this.startTime
  }
}
