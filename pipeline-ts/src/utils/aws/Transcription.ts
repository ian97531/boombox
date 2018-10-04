import { ITranscript } from '@boombox/shared/src/types/models/transcript'
import { AWS_TRANSCRIPTION } from '../../constants'
import { IAWSTranscriptionItem, IAWSTranscriptionResult } from '../../types/aws'
import { Speakers } from './Speakers'

export class AWSTranscription {
  private speakers: Speakers
  private items: IAWSTranscriptionItem[]

  constructor(result: IAWSTranscriptionResult) {
    this.speakers = new Speakers(result.speaker_labels)
    this.items = result.items
  }

  public getNormalizedTranscription(): ITranscript {
    const normalizedTranscription: ITranscript = []

    for (const item of this.items) {
      if (item.type === AWS_TRANSCRIPTION.PRONUNCIATION) {
        const speaker = this.speakers.getNextSpeaker()
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
}
