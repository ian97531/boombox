import { AWS_TRANSCRIPTION } from '../../constants'
import {
  IAWSTranscriptionSpeakerLabels,
  IAWSTranscriptionSpeakerLabelSegment,
} from '../../types/aws'

export class Speakers {
  private segments: IAWSTranscriptionSpeakerLabelSegment[]
  private item = 0
  private segment = 0

  constructor(speakerLabels: IAWSTranscriptionSpeakerLabels) {
    this.segments = speakerLabels.segments
  }

  public getNextSpeaker() {
    while (this.item >= this.segments[this.segment].items.length) {
      this.segment += 1
      this.item = 0
    }

    const speaker = this.segments[this.segment].items[this.item]
    this.item += 1

    return speaker.speaker_label === AWS_TRANSCRIPTION.SPEAKER_0 ? 0 : 1
  }
}
