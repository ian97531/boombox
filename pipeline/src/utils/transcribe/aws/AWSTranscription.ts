import {
  IAWSTranscriptionItem,
  IAWSTranscriptionResult,
  IAWSTranscriptionSpeakerLabelSegment,
  ITranscript,
} from '@boombox/shared'
import { round } from '@boombox/shared/src/utils/numbers'

enum AWS_TRANSCRIPTION {
  PRONUNCIATION = 'pronunciation',
  PUNCTUATION = 'punctuation',
  SPEAKER_0 = 'spk_0',
  SPEAKER_1 = 'spk_1',
}

export class AWSTranscription {
  private speakers: IAWSTranscriptionSpeakerLabelSegment[]
  private items: IAWSTranscriptionItem[]
  private item = 0
  private segment = 0
  private startTime = 0

  constructor(result: IAWSTranscriptionResult, startTime: number = 0) {
    this.speakers = result.speaker_labels.segments
    this.items = result.items
    this.startTime = startTime
  }

  public getNormalizedTranscription(): ITranscript {
    const normalizedTranscription: ITranscript = []

    for (const item of this.items) {
      if (item.type === AWS_TRANSCRIPTION.PRONUNCIATION) {
        const speaker = this.getNextSpeaker()
        normalizedTranscription.push({
          confidence: round(parseFloat(item.alternatives[0].confidence), 3),
          content: item.alternatives[0].content,
          endTime: round(parseFloat(item.end_time) + this.startTime, 3),
          speaker,
          startTime: round(parseFloat(item.start_time) + this.startTime, 3),
        })
      }
    }

    return normalizedTranscription
  }

  private getNextSpeaker() {
    while (this.item >= this.speakers[this.segment].items.length) {
      this.segment += 1
      this.item = 0
    }

    const speaker = this.speakers[this.segment].items[this.item]
    this.item += 1

    return speaker.speaker_label === AWS_TRANSCRIPTION.SPEAKER_0 ? 0 : 1
  }
}
