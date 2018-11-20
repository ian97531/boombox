export type IGoogleTranscriptionSpeakerTag = number

export interface IGoogleTranscriptionWord {
  startTime: string
  endTime: string
  word: string
  speakerTag: IGoogleTranscriptionSpeakerTag
}

export interface IGoogleTranscriptionAlternative {
  transcript: string
  confidence: number
  words: IGoogleTranscriptionWord[]
}

export interface IGoogleTranscriptionResult {
  alternatives: IGoogleTranscriptionAlternative[]
}

export interface IGoogleTranscription {
  results: IGoogleTranscriptionResult[]
}

export interface IGoogleSpeechResponse {
  name: string
  metadata: {
    progressPercent: number
    startTime: string
    lastUpdateTime: string
  }
  done: boolean
  error?: {
    code: number
    message: string
  }
  response?: IGoogleTranscription
}

export interface IGoogleCredentials {
  type: string
  project_id: string
  private_key_id: string
  private_key: string
  client_email: string
  client_id: string
  auth_uri: string
  token_uri: string
  auth_provider_x509_cert_url: string
  client_x509_cert_url: string
}

export interface IGoogleApiKey {
  key: string
}

export enum GoogleSpeechAudioEncoding {
  ENCODING_UNSPECIFIED = 'ENCODING_UNSPECIFIED',
  LINEAR16 = 'LINEAR16',
  FLAC = 'FLAC',
  MULAW = 'MULAW',
  ARM = 'ARM',
  ARM_WB = 'ARM_WB',
  OGG_OPUS = 'OGG_OPUS',
  SPEEX_WITH_HEADER_BYTE = 'SPEEX_WITH_HEADER_BYTE',
}

export enum GoogleSpeechInteractionType {
  INTERACTION_TYPE_UNSPECIFIED = 'INTERACTION_TYPE_UNSPECIFIED',
  DISCUSSION = 'DISCUSSION',
  PRESENTATION = 'PRESENTATION',
  PHONE_CALL = 'PHONE_CALL',
  VOICEMAIL = 'VOICEMAIL',
  PROFESSIONALLY_PRODUCED = 'PROFESSIONALLY_PRODUCED',
  VOICE_SEARCH = 'VOICE_SEARCH',
  VOICE_COMMAND = 'VOICE_COMMAND',
  DICTATION = 'DICTATION',
}

export enum GoogleSpeechMicrophoneDistance {
  MICROPHONE_DISTANCE_UNSPECIFIED = 'MICROPHONE_DISTANCE_UNSPECIFIED',
  NEARFIELD = 'NEARFIELD',
  MIDFIELD = 'MIDFIELD',
  FARFIELD = 'FARFIELD',
}

export enum GoogleSpeechOriginalMediaType {
  ORIGINAL_MEDIA_TYPE_UNSPECIFIED = 'ORIGINAL_MEDIA_TYPE_UNSPECIFIED',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
}

export enum GoogleSpeechRecordingDeviceType {
  RECORDING_DEVICE_TYPE_UNSPECIFIED = 'RECORDING_DEVICE_TYPE_UNSPECIFIED',
  SMARTPHONE = 'SMARTPHONE',
  PC = 'PC',
  PHONE_LINE = 'PHONE_LINE',
  VEHICLE = 'VEHICLE',
  OTHER_OUTDOOR_DEVICE = 'OTHER_OUTDOOR_DEVICE',
  OTHER_INDOOR_DEVICE = 'OTHER_INDOOR_DEVICE',
}

export enum GoogleSpeechModel {
  COMMAND_AND_SEARCH = 'command_and_search',
  PHONE_CALL = 'phone_call',
  VIDEO = 'video',
  DEFAULT = 'default',
}

export interface IGoogleSpeachContext {
  phrases: string[]
}

export interface IGoogleSpeechMetadata {
  interactionType?: GoogleSpeechInteractionType
  industryNaicsCodeOfAudio?: number
  microphoneDistance?: GoogleSpeechMicrophoneDistance
  originalMediaType?: GoogleSpeechOriginalMediaType
  recordingDeviceType?: GoogleSpeechRecordingDeviceType
  recordingDeviceName?: string
  originalMimeType?: string
  obfuscatedId?: string
  audioTopic?: string
}

export interface IGoogleSpeechRecognitionConfig {
  encoding?: GoogleSpeechAudioEncoding
  sampleRateHertz?: number
  languageCode: string
  audioChannelCount?: number
  enableSeparateRecognitionPerChannel?: boolean
  alternativeLanguageCodes?: string[]
  maxAlternatives?: number
  profanityFilter?: boolean
  speechContexts?: IGoogleSpeachContext[]
  enableWordTimeOffsets?: boolean
  enableWordConfidence?: boolean
  enableAutomaticPunctuation?: boolean
  enableSpeakerDiarization?: boolean
  diarizationSpeakerCount?: number
  metadata?: IGoogleSpeechMetadata
  model?: GoogleSpeechModel
  useEnhanced?: boolean
}

export type GoogleSpeechJobId = number
