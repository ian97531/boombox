import {
  IGoogleTranscription,
  IGoogleTranscriptionSpeakerTag,
  IGoogleTranscriptionWord,
  ITranscript,
} from '@boombox/shared'

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

  private getSpeakerforTag(speakerTag: IGoogleTranscriptionSpeakerTag): number {
    if (this.speakers.indexOf(speakerTag) === -1) {
      this.speakers.push(speakerTag)
    }
    return this.speakers.indexOf(speakerTag)
  }

  private timecodeToSeconds(timecode: string): number {
    return parseFloat(timecode) + this.startTime
  }
}
