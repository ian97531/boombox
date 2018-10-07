export const BUCKET_PREFIX = 'https://s3.amazonaws.com/'
export const DEFAULT_SEPARATOR = '/'
export const DEFAULT_SECONDARY_SEPARATOR = '_'
export const FEED_URL = 'https://www.hellointernet.fm/podcast?format=rss'
export const IGNORED_FILENAMES = ['.write_access_check_file.temp']
export const EPISODE_INSERT_LIMIT = 1
export const MAX_SEGMENT_LENGTH = 55 * 60 // 55 minutes
export const SEGMENT_OVERLAP_LENGTH = 4 * 60 // 4 minutes
export const SLUGIFY_OPTIONS = {
  lower: true,
  remove: /[*+~.()#$/^&\[\]|\\?<>,=_'"!:@]/g,
  replacement: '-',
}

export const TRANSCODE_SUCCESS_STATUSES = ['Complete']
export const TRANSCODE_ERROR_STATUSES = ['Canceled', 'Error']

export const AWS_TRANSCRIBE_SUCCESS_STATUS = 'COMPLETED'
export const AWS_TRANSCRIBE_ERROR_STATUS = 'FAILED'

export const WATSON_TRANSCRIBE_SUCCESS_STATUS = 'completed'
export const WATSON_TRANSCRIBE_ERROR_STATUS = 'failed'

export const M4A_PRESET = '1351620000001-100120' // M4A AAC 160 44k
export const MP3_PRESET = '1351620000001-300030' // MP3 160 44k
export const OGG_PRESET = '1531717800275-2wz911' // OGG Vorbis 160 44k

export enum AWS_TRANSCRIPTION {
  PRONUNCIATION = 'pronunciation',
  PUNCTUATION = 'punctuation',
  SPEAKER_0 = 'spk_0',
  SPEAKER_1 = 'spk_1',
}

export enum WATSON_TRANSCRIPTION {
  CONTENT = 0,
  CONFIDENCE = 1,
  START_TIME = 1,
  END_TIME = 2,
}

export enum FILE_DESIGNATIONS {
  ORIGINAL_AUDIO = 'original-audio',
  AUDIO_SEGMENT = 'audio-segment',
  AWS_RAW_TRANSCRIPTION_SEGMENT = 'aws-raw-transcription-segment',
  AWS_NORMALIZED_TRANSCRIPTION_SEGMENT = 'aws-normalized-transcription-segment',
  AWS_NORMALIZED_TRANSCRIPTION_FULL = 'aws-normalized-transcription-full',
  WATSON_RAW_TRANSCRIPTION_SEGMENT = 'watson-raw-transcription-segment',
  WATSON_NORMALIZED_TRANSCRIPTION_SEGMENT = 'watson-normalized-transcription-segment',
  WATSON_NORMALIZED_TRANSCRIPTION_FULL = 'watson-normalized-transcription-full',
  COMBINED_TRANSCRIPTION_FULL = 'combined-transcription-full',
  COMBINED_TRANSCRIPTION_INSERT_QUEUE = 'combined-transcription-insert-queue',
}
