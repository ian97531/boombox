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
