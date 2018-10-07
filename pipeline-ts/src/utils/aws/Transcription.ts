import { ITranscript } from '@boombox/shared/src/types/models/transcript'
import { AWS_TRANSCRIPTION } from '../../constants'
import {
  IAWSTranscriptionItem,
  IAWSTranscriptionResult,
  IAWSTranscriptionSpeakerLabelSegment,
} from '../../types/aws'

export class AWSTranscription {
  private speakers: IAWSTranscriptionSpeakerLabelSegment[]
  private items: IAWSTranscriptionItem[]
  private item = 0
  private segment = 0

  constructor(result: IAWSTranscriptionResult) {
    this.speakers = result.speaker_labels.segments
    this.items = result.items
  }

  public getNormalizedTranscription(): ITranscript {
    const normalizedTranscription: ITranscript = []

    for (const item of this.items) {
      if (item.type === AWS_TRANSCRIPTION.PRONUNCIATION) {
        const speaker = this.getNextSpeaker()
        normalizedTranscription.push({
          confidence: parseFloat(item.alternatives[0].confidence),
          content: item.alternatives[0].content,
          endTime: parseFloat(item.end_time),
          speaker,
          startTime: parseFloat(item.start_time),
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
