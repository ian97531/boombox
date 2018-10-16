export interface IAWSTranscriptionItemWordConfidence {
  confidence: string
  content: string
}

export interface IAWSTranscriptionItem {
  start_time: string
  end_time: string
  alternatives: IAWSTranscriptionItemWordConfidence[]
  type: 'pronunciation' | 'punctuation'
}

export interface IAWSTranscriptionSpeakerLabelItem {
  start_time: string
  end_time: string
  speaker_label: 'spk_0' | 'spk_1'
}
export interface IAWSTranscriptionSpeakerLabelSegment {
  start_time: string
  end_time: string
  speaker_label: string
  items: IAWSTranscriptionSpeakerLabelItem[]
}

export interface IAWSTranscriptionSpeakerLabels {
  speakers: number
  segments: IAWSTranscriptionSpeakerLabelSegment[]
}

export interface IAWSTranscriptionResult {
  transcripts: string[]
  speaker_labels: IAWSTranscriptionSpeakerLabels
  items: IAWSTranscriptionItem[]
}

export interface IAWSTranscription {
  jobName: string
  accountId: string
  results: IAWSTranscriptionResult
  status: string
}
